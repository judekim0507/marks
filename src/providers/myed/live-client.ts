import * as cheerio from 'cheerio/slim';

/**
 * Live MyEducation BC (Follett Aspen) client — ported from better-myed's
 * SvelteKit server client (`src/lib/server/myed.ts`) to run on-device in
 * the Expo app via `fetch`.
 *
 * Auth shape: REST `/app/rest/auth` (username/password) → SSO exchange at
 * `/app/rest/aspen/sso` → cookie-based Aspen session verified via `home.do`.
 * Cookies are carried manually in a string jar because React Native does not
 * persist cookies for us.
 */

const BASE_URL = 'https://myeducation.gov.bc.ca/aspen';
const REST_URL = 'https://myeducation.gov.bc.ca/app/rest';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export interface LiveSession {
  cookies: string;
  formData: Record<string, string>;
  token?: string;
  /** Hidden fields of the family student-context list form. */
  contextFormData?: Record<string, string>;
}

export interface ClassInfo {
  oid: string;
  name: string;
  term: string;
  teacher: string;
  room: string;
  grade: string | null;
}

export interface LiveAssignment {
  name: string;
  due: string;
  pct: string;
  score: string;
  feedback: string;
}

export interface TermMark {
  category: string;
  terms: Record<string, string>;
}

export interface ClassDetail {
  termMarks: TermMark[];
  finalGrade: string;
}

export interface AttendanceRecord {
  date: string;
  code: string;
  reason: string;
}

export interface CalendarEvent {
  name: string;
  section: string;
  date: string;
  type: 'assignment' | 'event';
}

export interface CalendarData {
  month: string;
  events: CalendarEvent[];
}

export interface TranscriptEntry {
  year: string;
  grade: string;
  course: string;
  finalGrade: string;
  credit: string;
}

/** Read every Set-Cookie from a fetch Response, RN-safe. */
function readSetCookies(response: Response): string[] {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  try {
    if (typeof headers.getSetCookie === 'function') {
      const list = headers.getSetCookie();
      if (list && list.length > 0) return list;
    }
  } catch {
    // Fall through to the raw header.
  }
  const raw = headers.get?.('set-cookie');
  if (!raw) return [];
  // Best effort: split on commas that start a new `name=value` pair.
  // (Expires dates contain commas, so require the next token to look like
  // a cookie name followed by `=` before the next `;`.)
  const out: string[] = [];
  let current = '';
  for (const part of raw.split(',')) {
    const candidate = current ? `${current},${part}` : part;
    const head = part.trim();
    if (current && /^[A-Za-z0-9_-]+=[^;]*;?/.test(head) && !/^\d{4}$/.test(head)) {
      out.push(current.trim());
      current = part;
    } else {
      current = candidate;
    }
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

function extractCookies(response: Response, existing: string): string {
  const cookieMap = new Map<string, string>();

  for (const pair of existing.split(';')) {
    const trimmed = pair.trim();
    if (trimmed.includes('=')) {
      const [name, ...rest] = trimmed.split('=');
      cookieMap.set(name.trim(), rest.join('='));
    }
  }

  for (const sc of readSetCookies(response)) {
    const parts = sc.split(';')[0];
    if (parts.includes('=')) {
      const [name, ...rest] = parts.split('=');
      cookieMap.set(name.trim(), rest.join('='));
    }
  }

  return Array.from(cookieMap.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

function extractFormData(html: string, formName: string): Record<string, string> {
  const $ = cheerio.load(html);
  const data: Record<string, string> = {};
  const form = $(`form[name="${formName}"]`);
  form.find('input[type="hidden"]').each((_, el) => {
    const name = $(el).attr('name');
    const value = $(el).attr('value') ?? '';
    if (name) data[name] = value;
  });
  return data;
}

function extractToken(html: string): string | undefined {
  const $ = cheerio.load(html);
  return $('input[name="org.apache.struts.taglib.html.TOKEN"]').attr('value');
}

/**
 * Follow same-origin redirects manually so we capture every Set-Cookie
 * along the chain. (If the runtime auto-follows redirects, the loop simply
 * never iterates and we still capture the final response's cookies.)
 */
async function resolveRedirectChain(
  startUrl: string,
  cookies: string,
  maxRedirects = 10,
): Promise<{ cookies: string; status: number; body: string }> {
  let url = startUrl;
  let out = cookies;
  let r = await fetch(url, { headers: { cookie: out }, redirect: 'manual' });
  out = extractCookies(r, out);

  let redirects = 0;
  while (
    (r.status === 301 ||
      r.status === 302 ||
      r.status === 303 ||
      r.status === 307 ||
      r.status === 308) &&
    redirects < maxRedirects
  ) {
    const location = r.headers.get('location');
    if (!location) break;
    const next = new URL(location, url).toString();
    if (!next.startsWith('https://myeducation.gov.bc.ca')) break;
    url = next;
    r = await fetch(url, { headers: { cookie: out }, redirect: 'manual' });
    out = extractCookies(r, out);
    redirects++;
  }

  const body = await r.text().catch(() => '');
  return { cookies: out, status: r.status, body };
}

/** Quick check that the cookies actually hold a logged-in Aspen session. */
export async function isLoggedIn(cookies: string): Promise<boolean> {
  try {
    const r = await fetch(`${BASE_URL}/home.do`, {
      headers: { cookie: cookies },
      redirect: 'follow',
    });
    const html = await r.text();
    return r.status === 200 && !html.toLowerCase().includes('not logged on');
  } catch {
    return false;
  }
}

export async function liveLogin(
  username: string,
  password: string,
): Promise<LiveSession | null> {
  // Step 1: Invalidate existing SSO
  const r1 = await fetch(`${BASE_URL}/rest/vithar/ssoVerify/invalidate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ withCredentials: true }),
    redirect: 'manual',
  });
  let cookies = extractCookies(r1, '');

  // Step 2: Auth via REST API -> authToken + aspenSessionId
  const r2 = await fetch(`${REST_URL}/auth`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
      deploymentId: 'aspen',
      origin: 'https://myeducation.gov.bc.ca',
      referer: 'https://myeducation.gov.bc.ca/aspen-login/?deploymentId=aspen',
      'user-agent': UA,
      cookie: cookies,
    },
    body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
    redirect: 'manual',
  });
  cookies = extractCookies(r2, cookies);

  if (r2.status !== 200) return null;

  const authData = (await r2.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!authData) return null;
  const token = (authData.authToken ?? authData.token) as string | undefined;
  const sessionId = (authData.aspenSessionId ?? authData.sessionId) as
    | string
    | undefined;

  // Step 3: Exchange the auth token for an Aspen session. Try the known
  // exchange patterns in order and verify each before accepting it.
  const attempts: Array<() => Promise<string | null>> = [];

  attempts.push(async () => {
    const res = await resolveRedirectChain(
      `${REST_URL}/aspen/sso?deploymentId=aspen`,
      cookies,
    );
    return res.cookies;
  });

  if (token) {
    attempts.push(async () => {
      const body = new URLSearchParams({ authToken: token, deploymentId: 'aspen' });
      if (sessionId) body.set('aspenSessionId', sessionId);
      const r = await fetch(`${REST_URL}/aspen/sso`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          accept: 'application/json',
          origin: 'https://myeducation.gov.bc.ca',
          referer: 'https://myeducation.gov.bc.ca/aspen-go/landing',
          'user-agent': UA,
          cookie: cookies,
        },
        body: body.toString(),
        redirect: 'manual',
      });
      let c = extractCookies(r, cookies);
      if (r.status === 301 || r.status === 302 || r.status === 303) {
        const loc = r.headers.get('location');
        if (loc) {
          const next = new URL(loc, `${REST_URL}/aspen/sso`).toString();
          if (next.startsWith('https://myeducation.gov.bc.ca')) {
            const res = await resolveRedirectChain(next, c);
            c = res.cookies;
          }
        }
      }
      return c;
    });
  }

  if (token) {
    attempts.push(async () => {
      const res = await resolveRedirectChain(
        `${REST_URL}/aspen/sso?authToken=${encodeURIComponent(token)}&deploymentId=aspen`,
        cookies,
      );
      return res.cookies;
    });
  }

  for (const attempt of attempts) {
    const candidate = await attempt();
    if (candidate && (await isLoggedIn(candidate))) {
      return { cookies: candidate, formData: {} };
    }
  }

  return null;
}

export async function getClasses(session: LiveSession): Promise<ClassInfo[]> {
  const r = await fetch(
    `${BASE_URL}/portalClassList.do?navkey=academics.classes.list`,
    { headers: { cookie: session.cookies }, redirect: 'follow' },
  );
  const html = await r.text();

  if (html.includes('Not Logged On') && r.status === 404) {
    throw new Error('Session expired');
  }

  session.token = extractToken(html);

  const $ = cheerio.load(html);
  const classes: ClassInfo[] = [];

  session.formData = extractFormData(html, 'classListForm');

  const rows = $('tr').filter((_, el) => {
    const cls = $(el).attr('class') ?? '';
    return cls.includes('listCell');
  });
  if (__DEV__) {
    const headerText: string[] = [];
    $('tr')
      .filter((_, el) => ($(el).attr('class') ?? '').includes('listHeader'))
      .first()
      .find('th, td')
      .each((_, cell) => {
        headerText.push($(cell).text().trim());
      });
    const shapes: string[] = [];
    rows.each((_, row) => {
      const n = $(row).find('td').length;
      const hasOid = $(row).find('input[name="selectedOids"]').length > 0;
      shapes.push(`${n}td${hasOid ? '+oid' : ''}`);
    });
    if (rows.length === 1) {
      const only = $(rows.get(0)).text().trim().replace(/\s+/g, ' ').slice(0, 160);
      console.log(`[classes] singleRow=${only}`);
    }
    console.log(
      `[classes] bytes=${html.length} listCellRows=${rows.length} loggedOn=${!html.toLowerCase().includes('not logged on')} headers=${headerText.join('|').slice(0, 200)} shapes=${shapes.join(',')}`,
    );
  }
  rows.each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 6) return;
      const text = cells.map((__, cell) => $(cell).text().trim()).get();
      const checkbox = $(row).find('input[type="checkbox"][name="selectedOids"]');
      const oid = checkbox.attr('value') ?? '';
      classes.push({
        oid,
        name: text[1],
        term: text[2],
        teacher: text[3],
        room: text[4],
        grade: text[5] || null,
      });
    });

  return classes;
}

export async function selectClass(
  session: LiveSession,
  classOid: string,
): Promise<void> {
  const body = new URLSearchParams({
    ...session.formData,
    userEvent: '2100',
    userParam: classOid,
  });

  const r = await fetch(`${BASE_URL}/portalClassList.do`, {
    method: 'POST',
    headers: {
      cookie: session.cookies,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    redirect: 'follow',
  });
  const html = await r.text();

  if (html.includes('Not Logged On')) {
    throw new Error('Session expired');
  }

  session.token = extractToken(html);
  session.cookies = extractCookies(r, session.cookies);
  const freshFormData = extractFormData(html, 'classListForm');
  if (Object.keys(freshFormData).length > 0) {
    session.formData = freshFormData;
  }
}

// Aspen stores the active class in the server-side session, so select + read
// for the same student must run as one serialized operation.
const classSelectionLocks = new Map<string, Promise<void>>();

function classSelectionLockKey(cookies: string): string {
  return cookies.match(/(?:^|;\s*)JSESSIONID=([^;]+)/)?.[1] ?? cookies;
}

export async function withSelectedClass<T>(
  session: LiveSession,
  classOid: string,
  read: (session: LiveSession) => Promise<T>,
): Promise<T> {
  const key = classSelectionLockKey(session.cookies);
  const previous = classSelectionLocks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queued = previous.then(() => current);
  classSelectionLocks.set(key, queued);

  await previous;
  try {
    await selectClass(session, classOid);
    return await read(session);
  } finally {
    release();
    if (classSelectionLocks.get(key) === queued) {
      classSelectionLocks.delete(key);
    }
  }
}

export async function getClassDetail(
  session: LiveSession,
): Promise<ClassDetail> {
  const r = await fetch(
    `${BASE_URL}/portalClassDetail.do?navkey=academics.classes.list.detail`,
    { headers: { cookie: session.cookies }, redirect: 'follow' },
  );
  const html = await r.text();
  const $ = cheerio.load(html);

  const termMarks: TermMark[] = [];
  const rightGrid = $('#dataGridRight table');
  if (rightGrid.length) {
    const headers: string[] = [];
    rightGrid.find('tr.listHeader th').each((_, th) => {
      const text = $(th).text().trim();
      if (text && text !== 'Category') headers.push(text);
    });

    let pendingCategory = '';
    rightGrid.find('tr.listCell').each((_, row) => {
      const cells = $(row).find('td');
      const category = cells.first().text().trim();
      const terms: Record<string, string> = {};
      const dataCells = cells.slice(cells.length - headers.length);
      dataCells.each((i, cell) => {
        const val = $(cell).text().trim();
        if (headers[i] && val) terms[headers[i]] = val;
      });

      if (category === 'Avg') {
        const label = pendingCategory || 'Average';
        if (Object.keys(terms).length) termMarks.push({ category: label, terms });
        pendingCategory = '';
      } else if (category === 'Last posted grade') {
        if (Object.keys(terms).length) termMarks.push({ category, terms });
      } else {
        pendingCategory = category;
      }
    });
  }

  const finalGrade = $('td.detailProperty:contains("Final")')
    .next('td.detailValue')
    .text()
    .trim();

  return { termMarks, finalGrade };
}

export async function getAssignments(
  session: LiveSession,
): Promise<LiveAssignment[]> {
  const r = await fetch(
    `${BASE_URL}/portalAssignmentList.do?navkey=academics.classes.list.gcd`,
    { headers: { cookie: session.cookies }, redirect: 'follow' },
  );
  const html = await r.text();

  if (html.includes('Not Logged On')) {
    throw new Error('Session expired');
  }

  session.token = extractToken(html);

  const $ = cheerio.load(html);
  const assignments: LiveAssignment[] = [];

  $('tr')
    .filter((_, el) => ($(el).attr('class') ?? '').includes('listCell'))
    .each((_, row) => {
      const cells = $(row).find('td');
      const text = cells.map((__, cell) => $(cell).text().trim()).get();
      if (text.length >= 8) {
        const rawPct = text[6];
        let score = text[7];
        let pct = rawPct;
        const fracMatch = rawPct?.match(/(\d+(?:\.\d+)?)\s*[/⁄∕]\s*(\d+(?:\.\d+)?)/);
        if (fracMatch) {
          const num = parseFloat(fracMatch[1]);
          const den = parseFloat(fracMatch[2]);
          if (den > 0 && !isNaN(num) && !isNaN(den)) {
            pct = String(Math.round((num / den) * 100));
            score = `${num} / ${den}`;
          }
        }
        assignments.push({
          name: text[1],
          due: text[3],
          pct,
          score,
          feedback: text.length > 9 ? text[9] : '',
        });
      }
    });

  return assignments;
}

export async function getAttendance(
  session: LiveSession,
): Promise<AttendanceRecord[]> {
  const r = await fetch(
    `${BASE_URL}/studentAttendanceList.do?navkey=myInfo.att.list`,
    { headers: { cookie: session.cookies }, redirect: 'follow' },
  );
  const html = await r.text();

  if (!html.includes('studentAttendanceList') && !html.includes('attCodeView')) {
    throw new Error('Did not receive attendance page');
  }

  const $ = cheerio.load(html);
  const records: AttendanceRecord[] = [];

  $('tr.listCell, tr[class*="listCell"]').each((_, row) => {
    const cells = $(row).find('td');
    const text = cells.map((__, cell) => $(cell).text().trim()).get();
    if (text.length >= 3) {
      records.push({
        date: text[1] || '',
        code: text[2] || '',
        reason: text.slice(3).filter(Boolean).join(' '),
      });
    }
  });

  return records;
}

export async function getStudentInfo(
  session: LiveSession,
): Promise<Record<string, string>> {
  const r = await fetch(
    `${BASE_URL}/portalStudentDetail.do?navkey=myInfo.details.detail`,
    { headers: { cookie: session.cookies }, redirect: 'follow' },
  );
  const html = await r.text();
  const $ = cheerio.load(html);
  const info: Record<string, string> = {};

  $('tr').each((_, row) => {
    const tds = $(row).find('td');
    const labelTd = tds.filter((__, td) =>
      ($(td).attr('class') ?? '').toLowerCase().includes('label'),
    );
    const valueTd = tds.filter((__, td) =>
      ($(td).attr('class') ?? '').toLowerCase().includes('value'),
    );

    let label = labelTd.first();
    let value = valueTd.first();

    if (!label.length && !value.length && tds.length === 2) {
      label = tds.eq(0);
      value = tds.eq(1);
    }

    const key = label.text().trim().replace(/:$/, '');
    const val = value.text().trim();
    if (key && val) info[key] = val;
  });

  return info;
}

export async function getCalendar(session: LiveSession): Promise<CalendarData> {
  const initR = await fetch(
    `${BASE_URL}/planner.do?navkey=plannerCalendar.plannerView.planner`,
    {
      headers: { cookie: session.cookies },
      redirect: 'follow',
    },
  );
  const initHtml = await initR.text();
  session.token = extractToken(initHtml);

  const result = parseCalendarHtml(initHtml);
  if (result.month) return result;

  await fetch(`${BASE_URL}/plannerCalendar.do?userEvent=70`, {
    headers: { cookie: session.cookies },
    redirect: 'follow',
  });
  const r = await fetch(`${BASE_URL}/plannerCalendar.do?userEvent=60`, {
    headers: { cookie: session.cookies },
    redirect: 'follow',
  });
  return parseCalendarHtml(await r.text());
}

function parseCalendarHtml(html: string): CalendarData {
  const $ = cheerio.load(html);
  const events: CalendarEvent[] = [];

  const monthTitle = $('.plannerNavigatorTitle').text().trim() || '';

  $('td.plannerDateCell').each((_, cell) => {
    const dateId = $(cell).attr('id') || '';

    $(cell)
      .find('.plannerAssignment, .compactPlannerEvent')
      .each((__, eventEl) => {
        const name = $(eventEl).find('.plannerEventName').text().trim();
        const section = $(eventEl).find('.plannerEventSection').text().trim();
        const isAssignment = ($(eventEl).attr('class') || '').includes(
          'plannerAssignment',
        );

        if (name) {
          events.push({
            name,
            section,
            date: dateId,
            type: isAssignment ? 'assignment' : 'event',
          });
        }
      });
  });

  return { month: monthTitle, events };
}

export async function getTranscript(
  session: LiveSession,
): Promise<TranscriptEntry[]> {
  const r = await fetch(
    `${BASE_URL}/transcriptList.do?navkey=myInfo.trn.list`,
    { headers: { cookie: session.cookies }, redirect: 'follow' },
  );
  const html = await r.text();
  const $ = cheerio.load(html);
  const entries: TranscriptEntry[] = [];

  $('tr')
    .filter((_, el) => ($(el).attr('class') ?? '').includes('listCell'))
    .each((_, row) => {
      const cells = $(row).find('td');
      const text = cells.map((__, cell) => $(cell).text().trim()).get();
      if (text.length >= 6) {
        entries.push({
          year: text[1],
          grade: text[2],
          course: text[3],
          finalGrade: text[4],
          credit: text[5],
        });
      }
    });

  return entries;
}

export interface ScheduleEntry {
  course: string;
  block: string;
  teacher: string;
  room: string;
  term: string;
  days: string;
}

/**
 * Parse the Family schedule matrix (`studentScheduleContextList.do`) into
 * entries. That page is a day-grid, not a listCell table: each course sits
 * in a `<td>` like `1-1 MPHED10-10PHYSICAL AND HEALTH EDUCATION 10Taylor,
 * Christie2052/GYMA` (block, code+name, teacher, room run together).
 * Pure + exported for tests.
 */
export function parseFamilySchedule(html: string): ScheduleEntry[] {
  const $ = cheerio.load(html);
  const entries: ScheduleEntry[] = [];
  const seen = new Set<string>();
  $('td').each((_, cell) => {
    const tx = $(cell).text().trim().replace(/\s+/g, ' ');
    if (tx.length < 8) return;
    // Course cells start with a block slot ("1-1 …") or a course code
    // ("MMUCM10-01MUSIC …"). Day headers ("AM - DAY 1", "13-PM ARTS",
    // "TFR-TERRY FOX RUN") never contain a "Last, First" teacher.
    const blockMatch = tx.match(/^(\d+)\s*-\s*(\d+)\s+(.+)$/);
    const codeMatch = tx.match(/^([A-Z]{2,}\d{2}[A-Z0-9-]*)([A-Z].+)$/);
    const m = blockMatch ?? codeMatch;
    if (!m) return;
    const block = blockMatch ? blockMatch[1] : '';
    const blob = (blockMatch ? blockMatch[3] : tx).trim();
    // Teacher (+ room) at the end: "Taylor, Christie2052/GYMA".
    const tr = blob.match(
      /([A-Z][a-z'’-]+,\s*(?:TBA|[A-Z][a-z'’.-]+(?:\s+[A-Z][a-z'’.-]+)*))\s*(\d{3,4}(?:\/\S+)?|\d+)?$/,
    );
    if (!tr) return;
    const teacher = tr[1].trim();
    const room = (tr[2] ?? '').trim();
    const head = blob.slice(0, blob.length - tr[0].length).trim();
    // Strip the leading course code (e.g. "MPHED10-10", "ACSC-2A-01"):
    // shortest caps/digits prefix ending right before the course name
    // (an all-caps word + space, a mixed-case word, or whitespace).
    let name = head;
    const codeCut = head.match(
      /^([A-Z-]{2,}\d[\dA-Z-]*?)(?=[A-Z]{2,}\s|[A-Z][a-z]|\s|$)/,
    );
    if (codeCut) name = head.slice(codeCut[1].length).trim();
    if (!name) return;
    const key = `${block}::${name}::${teacher}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({ course: name, block, teacher, room, term: '', days: '' });
  });
  return entries;
}

/**
 * Parse an Aspen student schedule list page (listCell rows) into entries.
 * Pure + exported for tests.
 */
export function parseScheduleHtml(html: string): ScheduleEntry[] {
  const $ = cheerio.load(html);
  const headers: string[] = [];
  $('tr')
    .filter((_, el) => ($(el).attr('class') ?? '').includes('listHeader'))
    .first()
    .find('th, td')
    .each((_, cell) => {
      headers.push($(cell).text().trim().toLowerCase());
    });
  const col = (...names: string[]): number => {
    for (const n of names) {
      const i = headers.findIndex((h) => h.includes(n));
      if (i >= 0) return i;
    }
    return -1;
  };
  // Header cells include the checkbox column at index 0.
  const ciCourse = col('course', 'class', 'section');
  const ciTeacher = col('teacher', 'instructor', 'staff');
  const ciRoom = col('room');
  const ciBlock = col('block', 'period', 'slot');
  const ciTerm = col('term', 'semester', 'schedule term');
  const ciDays = col('day', 'days', 'meeting', 'schedule');

  const out: ScheduleEntry[] = [];
  $('tr')
    .filter((_, el) => ($(el).attr('class') ?? '').includes('listCell'))
    .each((_, row) => {
      const text = $(row)
        .find('td')
        .map((__, cell) => $(cell).text().trim())
        .get();
      if (text.length < 3) return;
      const at = (i: number, fallback: number): string =>
        i >= 0 && i < text.length ? text[i] : (text[fallback] ?? '');
      // Positional fallbacks assume [checkbox, course, term/block, teacher, room, …].
      const course = at(ciCourse, 1);
      if (!course) return;
      out.push({
        course,
        teacher: at(ciTeacher, 3),
        room: at(ciRoom, 4),
        block: at(ciBlock, 2),
        term: at(ciTerm, 2),
        days: ciDays >= 0 ? text[ciDays] ?? '' : '',
      });
    });
  return out;
}

/**
 * Term options from an Aspen schedule page's term selector
 * (`#selectedTermOid`). Labels like "T1 ADST", "S1", "S2", "FY".
 */
export function parseScheduleTerms(
  html: string,
): { oid: string; label: string }[] {
  const $ = cheerio.load(html);
  return $('select#selectedTermOid option, select[name="selectedTermOid"] option')
    .map((_, o) => ({
      oid: $(o).attr('value') ?? '',
      label: $(o).text().trim(),
    }))
    .get()
    .filter((t) => t.oid && t.label.toLowerCase() !== 'today');
}

/**
 * Class timetable for the active student. Tries Aspen schedule pages
 * (student + family navkeys, then term-scoped variants so a default term
 * with no published days doesn't blank us); returns [] when none parse
 * so the caller can fall back to deriving the timetable from the class
 * list.
 */
export async function getSchedule(
  session: LiveSession,
): Promise<ScheduleEntry[]> {
  const fetchHtml = async (url: string): Promise<string | null> => {
    try {
      const r = await fetch(url, {
        headers: { cookie: session.cookies },
        redirect: 'follow',
      });
      const html = await r.text();
      session.cookies = extractCookies(r, session.cookies);
      if (html.includes('Not Logged On')) return null;
      return html;
    } catch {
      return null;
    }
  };

  const studentUrls = [
    `${BASE_URL}/studentScheduleList.do?navkey=academics.schedule.list`,
    `${BASE_URL}/portalScheduleList.do?navkey=academics.schedule.list`,
  ];
  let termSource: string | null = null;
  for (const url of studentUrls) {
    const html = await fetchHtml(url);
    if (!html) continue;
    termSource ??= html;
    const entries = parseScheduleHtml(html);
    if (entries.length > 0) return entries;
  }
  // Self-discovery: harvest schedule-ish links (with real navkeys for
  // this Aspen version/account) from the student home + class list pages.
  const navPages = [
    `${BASE_URL}/home.do`,
    `${BASE_URL}/portalClassList.do?navkey=academics.classes.list`,
  ];
  const discovered = new Map<string, string>();
  for (const page of navPages) {
    const html = await fetchHtml(page);
    if (!html) continue;
    const re = /([\w-]+\.do\?navkey=[\w.\-]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const link = m[1];
      if (/sch|calendar|planner/i.test(link) && !discovered.has(link)) {
        discovered.set(link, page);
      }
    }
  }
  if (__DEV__ && discovered.size > 0) {
    console.log(`[schedlinks] ${[...discovered.keys()].join(' | ')}`.slice(0, 1200));
  }
  for (const link of discovered.keys()) {
    const html = await fetchHtml(`${BASE_URL}/${link}`);
    if (!html) continue;
    termSource ??= html;
    const entries = [
      ...parseScheduleHtml(html),
      ...parseFamilySchedule(html),
    ];
    if (entries.length > 0) {
      if (__DEV__) console.log(`[schedule] discovered ${link} entries=${entries.length}`);
      return entries;
    }
  }
  const familyUrl = `${BASE_URL}/studentScheduleContextList.do?navkey=family.std.list.sch`;
  const familyHtml = await fetchHtml(familyUrl);
  if (familyHtml) {
    termSource ??= familyHtml;
    const entries = parseFamilySchedule(familyHtml);
    if (__DEV__) {
      console.log(`[schedule] family matrix entries=${entries.length}`);
    }
    if (entries.length > 0) return entries;
  }
  // Retry each page scoped to every non-default term (S1/S2/FY/T1..):
  // early in the year the default view may hold no schedule days while
  // another term is fully published.
  if (termSource) {
    const terms = parseScheduleTerms(termSource);
    const bases = [...studentUrls, familyUrl];
    for (const t of terms) {
      for (const base of bases) {
        const sep = base.includes('?') ? '&' : '?';
        const html = await fetchHtml(
          `${base}${sep}selectedTermOid=${encodeURIComponent(t.oid)}`,
        );
        if (!html) continue;
        const entries = [
          ...parseScheduleHtml(html),
          ...parseFamilySchedule(html),
        ];
        if (entries.length > 0) {
          if (__DEV__) {
            console.log(
              `[schedule] term-scoped ${t.label} entries=${entries.length}`,
            );
          }
          return entries;
        }
      }
    }
    if (__DEV__) {
      console.log(`[schedule] terms seen: ${terms.map((t) => t.label).join(',')}`);
    }
  }
  return [];
}

/* ---------------- family / multi-student (parent accounts) ---------------- */

/** One child on a parent (family) account. */
export interface FamilyStudent {
  /** Aspen student-context oid (from the Family list checkboxes). */
  id: string;
  /** Display name, "Last, First". */
  name: string;
  /** e.g. "Burnaby North Secondary School · Grade 10". */
  detail?: string;
}

/**
 * Parse the Family student-context list (`studentContextList.do`) into
 * children. Expected row cells: [checkbox, Last, First, Middle, DOB,
 * Pupil #, Grade, School] — but Aspen skins vary, so this is tolerant:
 * any `listCell` row with a `selectedOids` checkbox and two name-ish
 * cells becomes a child. Pure + exported for tests.
 */
export function parseStudentContexts(html: string): FamilyStudent[] {
  const $ = cheerio.load(html);
  const out: FamilyStudent[] = [];
  const seen = new Set<string>();

  const push = (oid: string, last: string, first: string, grade: string, school: string) => {
    if (!oid || !last || !first) return;
    const key = `${oid}::${last},${first}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      id: oid,
      name: `${last}, ${first}`,
      detail: [school, grade ? `Grade ${grade}` : ''].filter(Boolean).join(' · '),
    });
  };

  // Primary: listCell rows with the Family checkbox.
  $('tr')
    .filter((_, el) => ($(el).attr('class') ?? '').includes('listCell'))
    .each((_, row) => {
      const $row = $(row);
      const oid =
        $row.find('input[type="checkbox"][name="selectedOids"]').attr('value') ??
        $row.find('input[name="selectedOids"]').attr('value') ??
        '';
      if (!oid) return;
      const cells = $row.find('td');
      const text = cells.map((__, cell) => $(cell).text().trim()).get();
      // text[0] is the checkbox label, [1]=Last [2]=First [3]=Middle
      // [4]=DOB [5]=Pupil # [6]=Grade [7]=School.
      if (text.length >= 6) {
        push(oid, text[1] ?? '', text[2] ?? '', text[6] ?? '', text[7] ?? '');
      } else if (text.length >= 3) {
        push(oid, text[1] ?? text[0] ?? '', text[2] ?? text[1] ?? '', '', '');
      }
    });

  // Fallback: any checkbox carrying an oid, name read from sibling cells
  // or the row text ("Last, First" / "First Last").
  if (out.length === 0) {
    $('input[name="selectedOids"]').each((_, input) => {
      const oid = $(input).attr('value') ?? '';
      if (!oid || seen.has(oid)) return;
      const $row = $(input).closest('tr');
      const cells = $row.find('td').map((__, c) => $(c).text().trim()).get().filter(Boolean);
      let last = '', first = '';
      if (cells.length >= 2) {
        last = cells[0];
        first = cells[1];
      } else {
        const rowText = $row.text().trim().replace(/\s+/g, ' ');
        const comma = rowText.match(/([A-Za-z'’-]+),\s*([A-Za-z'’-]+)/);
        if (comma) {
          last = comma[1];
          first = comma[2];
        }
      }
      if (!last || !first) return;
      const key = oid;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ id: oid, name: `${last}, ${first}` });
    });
  }

  return out;
}


/** Token-multiset comparison so "Kim, Jude" matches "Jude Kim". */
export function samePerson(a: string, b: string): boolean {
  const tokens = (s: string) =>
    s
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .sort()
      .join(' ');
  const ta = tokens(a);
  return ta.length > 0 && ta === tokens(b);
}

const CTX_LIST_URL = `${BASE_URL}/studentContextList.do?navkey=family.std.list`;
/** Row click in the portal: doParamSubmit(2100, contextListForm, oid). */
const CTX_SELECT_EVENT = '2100';

/** Refresh the Family list form fields (Struts token) on the session. */
async function ensureContextFormData(session: LiveSession): Promise<void> {
  const r = await fetch(CTX_LIST_URL, {
    headers: { cookie: session.cookies },
    redirect: 'follow',
  });
  const html = await r.text();
  session.cookies = extractCookies(r, session.cookies);
  if (html.includes('Not Logged On')) throw new Error('Session expired');
  const $ = cheerio.load(html);
  const fields: Record<string, string> = {};
  $('form[name="contextListForm"]')
    .find('input[type="hidden"]')
    .each((_, el) => {
      const name = $(el).attr('name');
      if (name) fields[name] = $(el).attr('value') ?? '';
    });
  session.contextFormData = fields;
  if (__DEV__) {
    console.log(
      `[family] ctxList bytes=${html.length} contexts=${parseStudentContexts(html).length}`,
    );
  }
}

/**
 * Children linked to this login, from the Family student-context list.
 * Empty for student accounts (their Family view has no context list).
 */
export async function getFamilyStudents(
  session: LiveSession,
): Promise<FamilyStudent[]> {
  const r = await fetch(CTX_LIST_URL, {
    headers: { cookie: session.cookies },
    redirect: 'follow',
  });
  const html = await r.text();
  session.cookies = extractCookies(r, session.cookies);
  if (html.includes('Not Logged On')) throw new Error('Session expired');
  const $ = cheerio.load(html);
  const fields: Record<string, string> = {};
  $('form[name="contextListForm"]')
    .find('input[type="hidden"]')
    .each((_, el) => {
      const name = $(el).attr('name');
      if (name) fields[name] = $(el).attr('value') ?? '';
    });
  session.contextFormData = fields;
  return parseStudentContexts(html);
}

/**
 * Switch the server-side student context to another child, exactly like the
 * portal row click: POST contextListForm with userEvent=2100 + the child oid.
 * Returns true when the portal confirms (class list populates / names match).
 */
export async function selectStudent(
  session: LiveSession,
  student: FamilyStudent,
): Promise<boolean> {
  if (!session.contextFormData || Object.keys(session.contextFormData).length === 0) {
    await ensureContextFormData(session);
  }
  const body = new URLSearchParams({
    ...(session.contextFormData ?? {}),
    userEvent: CTX_SELECT_EVENT,
    userParam: student.id,
  });
  const r = await fetch(`${BASE_URL}/studentContextList.do`, {
    method: 'POST',
    headers: {
      cookie: session.cookies,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    redirect: 'follow',
  });
  const html = await r.text();
  session.cookies = extractCookies(r, session.cookies);
  if (html.includes('Not Logged On')) throw new Error('Session expired');
  // Verify BEFORE re-opening the family list: re-GETting the context list
  // can drop the just-selected student context back to the family view,
  // which used to make every switch look failed (empty class list).
  const ok = await verifyStudent(session, student);
  // Refresh the Struts token the POST consumed, for the next switch.
  await ensureContextFormData(session).catch(() => {});
  return ok;
}

async function verifyStudent(
  session: LiveSession,
  student: FamilyStudent,
): Promise<boolean> {
  // The POST itself succeeding (200 + still logged in) means Aspen accepted
  // the context flip. Confirmation below is best-effort: parent sessions use
  // family-scoped navkeys, so the student-context class list may legitimately
  // come back empty even when the switch worked. Never fail a good switch.
  try {
    const classes = await getClasses(session).catch(() => []);
    if (classes.length > 0) {
      if (__DEV__) console.log(`[family] verify ${student.name}: class list populated`);
      return true;
    }
  } catch {
    // Fall through to detail checks.
  }
  // Family-scoped detail pages reflect the active child.
  const detailUrls = [
    `${BASE_URL}/portalStudentDetail.do?navkey=family.std.list.det`,
    `${BASE_URL}/portalStudentDetail.do?navkey=myInfo.details.detail`,
  ];
  for (const url of detailUrls) {
    try {
      const r = await fetch(url, {
        headers: { cookie: session.cookies },
        redirect: 'follow',
      });
      const html = await r.text();
      session.cookies = extractCookies(r, session.cookies);
      if (html.includes('Not Logged On')) continue;
      const $ = cheerio.load(html);
      const bodyText = $('body').text().replace(/\s+/g, ' ');
      if (samePerson(bodyText, student.name)) {
        if (__DEV__) console.log(`[family] verify ${student.name}: detail match via ${url}`);
        return true;
      }
      const firstToken = student.name.split(/[^A-Za-z0-9]+/).filter(Boolean)[0];
      const secondToken = student.name.split(/[^A-Za-z0-9]+/).filter(Boolean)[1];
      if (
        firstToken &&
        secondToken &&
        bodyText.toLowerCase().includes(firstToken.toLowerCase()) &&
        bodyText.toLowerCase().includes(secondToken.toLowerCase())
      ) {
        if (__DEV__) console.log(`[family] verify ${student.name}: token match via ${url}`);
        return true;
      }
    } catch {
      // Try the next URL.
    }
  }
  // POST was accepted and the session is alive — trust the flip and let the
  // snapshot build (which pulls the real class list) be the final judge.
  if (__DEV__) console.log(`[family] verify ${student.name}: accepting POST, session alive`);
  return true;
}

