import { useEffect, useState } from 'react';
import type { SFSymbol } from 'expo-symbols';

import type {
  Assignment as AppAssignment,
  AttendanceData,
  Course,
  CourseDetail,
  GradeCategory,
  ScheduleData,
  SchoolProvider,
  TranscriptData,
  UpcomingItem,
} from '@/providers/types';
import type { AuthSession } from '@/providers/auth';
import { bcLetterFor } from '@/providers/myed/index';
import {
  getAssignments,
  getAttendance,
  getCalendar,
  getClassDetail,
  getClasses,
  getSchedule,
  getStudentInfo,
  getTranscript,
  withSelectedClass,
  type AttendanceRecord as LiveAttendanceRecord,
  type ClassDetail as LiveClassDetail,
  type ClassInfo,
  type LiveAssignment,
  type LiveSession,
  type TranscriptEntry,
} from '@/providers/myed/live-client';

/** Live (real MyEd) snapshot cached inside the auth session. */
export interface LiveSnapshot {
  termLabel: string;
  displayName: string;
  schoolLine: string;
  studentId: string;
  courses: Course[];
  /** Per-course detail keyed by Aspen class oid. May be partial. */
  details: Record<string, CourseDetail>;
  attendance: AttendanceData;
  upcoming: UpcomingItem[];
  transcript: TranscriptData;
  schedule: ScheduleData;
  /** Global recent attendance, reused for the per-course tab. */
  recentAttendance: { date: string; detail: string; status: string }[];
}

export interface LiveCore {
  cookies: string;
  formData: Record<string, string>;
}

/* ---------------- parsing helpers ---------------- */

const LETTER_TO_NUMBER: Record<string, number> = {
  A: 90,
  'B': 79,
  'C+': 70,
  C: 63,
  'C-': 55,
  F: 40,
};

/** Parse an Aspen grade cell ("88.5", "16.5 / 18", "A", null) to a number. */
export function parseGradeValue(raw: string | null | undefined): number {
  if (!raw) return 0;
  const text = raw.trim();
  if (!text) return 0;
  const frac = text.match(/(\d+(?:\.\d+)?)\s*[/⁄∕]\s*(\d+(?:\.\d+)?)/);
  if (fracMatchOk(frac)) {
    const num = parseFloat(frac[1]);
    const den = parseFloat(frac[2]);
    if (den > 0) return Math.round((num / den) * 1000) / 10;
  }
  const leading = text.match(/(\d+(?:\.\d+)?)/);
  if (leading) return parseFloat(leading[1]);
  const upper = text.toUpperCase();
  if (upper in LETTER_TO_NUMBER) return LETTER_TO_NUMBER[upper];
  if (upper === 'IP' || upper === 'W' || upper === 'N/A') return 0;
  return 0;
}

function fracMatchOk(frac: RegExpMatchArray | null): frac is RegExpMatchArray {
  return frac !== null;
}

function symbolForCourse(name: string): SFSymbol {
  const n = name.toLowerCase();
  if (/chem|physic|science|bio/.test(n)) return 'flask.fill';
  if (/math|calcul|stat|algebra|geometr/.test(n)) return 'function';
  if (/english|writing|literat|essay/.test(n)) return 'book.closed.fill';
  if (/social|histor|geograph|law|psych/.test(n)) return 'globe';
  if (/french|spanish|language|mandarin/.test(n)) return 'text.bubble.fill';
  if (/comput|program|code|robot|tech/.test(n))
    return 'chevron.left.forwardslash.chevron.right';
  if (/pe\b|physical|fitness|gym|sport/.test(n)) return 'figure.run';
  if (/band|music|choir|art|drama|theatr/.test(n)) return 'music.note';
  return 'book.closed.fill';
}

/** Aspen class-list rows carry a term slot, not a block letter. */
function courseFromClassInfo(info: ClassInfo): Course {
  const grade = parseGradeValue(info.grade);
  return {
    id: info.oid,
    name: info.name,
    block: info.term || '',
    teacher: info.teacher,
    room: info.room,
    grade,
    symbol: symbolForCourse(info.name),
  };
}

/** Pick the term column to display: the class's own term, else last filled. */
function pickTermColumn(
  terms: Record<string, string>,
  preferred: string,
): string | null {
  if (preferred && terms[preferred]) return terms[preferred];
  const keys = Object.keys(terms);
  for (let i = keys.length - 1; i >= 0; i--) {
    if (terms[keys[i]]) return terms[keys[i]];
  }
  return keys.length > 0 ? terms[keys[0]] : null;
}

function categoryFromTermMark(
  category: string,
  terms: Record<string, string>,
  preferredTerm: string,
): GradeCategory | null {
  const value = pickTermColumn(terms, preferredTerm);
  if (!value) return null;
  const score = parseGradeValue(value);
  const display = value.includes('/') ? value.replace(/\s+/g, '') : value;
  return {
    id: category.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: category,
    weight: '',
    score,
    display,
    letter: bcLetterFor(score),
  };
}

function assignmentFromLive(a: LiveAssignment, index: number): AppAssignment {
  let score: string | null = null;
  if (a.score && a.score.includes('/')) {
    score = a.score.replace(/\s+/g, '');
  } else if (a.score && a.score.trim()) {
    score = a.score.trim();
  } else if (a.pct && /^\d+(\.\d+)?$/.test(a.pct.trim())) {
    score = `${a.pct.trim()}%`;
  }
  return {
    id: `live-${index}-${a.name}`,
    name: a.name,
    date: a.due,
    score,
  };
}

function attendanceStatus(code: string): string {
  const c = code.trim().toUpperCase();
  if (c.startsWith('A')) return 'Absent';
  if (c.startsWith('L')) return 'Late';
  if (c.startsWith('T')) return 'Late';
  return code || 'Present';
}

function mapAttendanceRecords(
  records: LiveAttendanceRecord[],
): { date: string; detail: string; status: string }[] {
  return records.map((r) => ({
    date: r.date,
    detail: r.reason || r.code,
    status: attendanceStatus(r.code),
  }));
}

function formatUpcomingDate(dateId: string): string {
  const d = new Date(dateId);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return dateId;
}

function profileFromStudentInfo(
  info: Record<string, string>,
  username: string,
): { displayName: string; schoolLine: string; studentId: string } {
  const find = (re: RegExp): string => {
    for (const [k, v] of Object.entries(info)) {
      if (re.test(k) && v) return v;
    }
    return '';
  };
  // Aspen shows "Last, First"; flip for display.
  const rawName = find(/^(student\s*)?name$/i) || find(/name/i);
  const displayName = rawName.includes(',')
    ? rawName
        .split(',')
        .map((p) => p.trim())
        .reverse()
        .join(' ')
    : rawName || username;
  const school = find(/school/i) || 'MyEducation BC';
  const gradeLevel = find(/grade(\s*level)?/i);
  const studentId = find(/pupil|student\s*(#|id|number)/i) || username;
  return {
    displayName,
    schoolLine: gradeLevel ? `${school} · Grade ${gradeLevel}` : school,
    studentId,
  };
}

/* ---------------- snapshot assembly ---------------- */

async function withConcurrency<T>(
  items: string[],
  limit: number,
  run: (id: string, index: number) => Promise<T>,
  onStep?: (done: number, total: number) => void,
): Promise<T[]> {
  const results: T[] = new Array(items.length);
  let next = 0;
  let done = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await run(items[i], i);
      done++;
      onStep?.(done, items.length);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

export function placeholderDetail(): CourseDetail {
  return {
    updated: 'Unavailable offline',
    categories: [],
    assignments: [],
    attendance: { summary: [], records: [] },
  };
}

function detailFromLive(
  classOid: string,
  preferredTerm: string,
  liveDetail: LiveClassDetail,
  assignments: LiveAssignment[],
  recentAttendance: { date: string; detail: string; status: string }[],
): CourseDetail {
  const categories: GradeCategory[] = [];
  for (const tm of liveDetail.termMarks) {
    const cat = categoryFromTermMark(tm.category, tm.terms, preferredTerm);
    if (cat) categories.push(cat);
  }
  return {
    updated: `Final: ${liveDetail.finalGrade || '—'}`,
    categories,
    assignments: assignments.map(assignmentFromLive),
    attendance: {
      summary: [],
      records: recentAttendance.map((r, i) => ({
        id: `live-${classOid}-${i}`,
        date: r.date,
        detail: r.detail,
        status: r.status,
      })),
    },
  };
}

export async function buildLiveSnapshot(
  username: string,
  core: LiveCore,
  onProgress?: (label: string) => void,
): Promise<LiveSnapshot> {
  const session: LiveSession = {
    cookies: core.cookies,
    formData: core.formData,
  };

  onProgress?.('Loading your profile…');
  const [info, classes] = await Promise.all([
    getStudentInfo(session),
    getClasses(session),
  ]);
  core.cookies = session.cookies;
  core.formData = session.formData;

  const profile = profileFromStudentInfo(info, username);
  let courses = classes.map(courseFromClassInfo);
  if (__DEV__) {
    console.log(
      `[snapshot] student=${profile.displayName} classes=${classes.length}`,
    );
  }
  const termLabel =
    mostCommon(classes.map((c) => c.term).filter(Boolean)) || 'Current term';

  onProgress?.('Loading grades & attendance…');
  const [transcriptEntries, attendanceRecords, calendar, scheduleEntries] = await Promise.all([
    getTranscript(session).catch((): [] => []),
    getAttendance(session).catch((): [] => []),
    getCalendar(session).catch(() => ({ month: '', events: [] })),
    getSchedule(session).catch((): [] => []),
  ]);
  core.cookies = session.cookies;

  const recentAttendance = mapAttendanceRecords(attendanceRecords).slice(0, 30);
  // Aspen's class list can be empty ("No matching records" early in the
  // school year) while the Family schedule matrix is full — backfill the
  // course list from the timetable so home + schedule aren't blank.
  // Grades stay 0 (nothing published yet), never fabricated.
  if (courses.length === 0 && scheduleEntries.length > 0) {
    courses = scheduleEntries.map((e, i) => ({
      id: `live-sch-course-${i}`,
      name: e.course,
      block: e.block,
      teacher: e.teacher,
      room: e.room,
      grade: 0,
      symbol: symbolForCourse(e.course),
    }));
    if (__DEV__) {
      console.log(`[snapshot] backfilled ${courses.length} courses from schedule`);
    }
  }
  if (__DEV__) {
    console.log(
      `[snapshot] transcript=${transcriptEntries.length} attendance=${attendanceRecords.length} schedule=${scheduleEntries.length}`,
    );
  }

  onProgress?.(`Loading classes (0/${classes.length})…`);
  const details: Record<string, CourseDetail> = {};
  await withConcurrency(
    classes.map((c) => c.oid),
    3,
    async (oid, index) => {
      try {
        const fresh: LiveSession = {
          cookies: core.cookies,
          formData: core.formData,
        };
        const [d, a] = await withSelectedClass(fresh, oid, async (s) => {
          const [detail, assigns] = await Promise.all([
            getClassDetail(s),
            getAssignments(s),
          ]);
          return [detail, assigns] as const;
        });
        core.cookies = fresh.cookies;
        core.formData = fresh.formData;
        details[oid] = detailFromLive(
          oid,
          classes[index]?.term ?? '',
          d,
          a,
          recentAttendance.slice(0, 8),
        );
      } catch {
        details[oid] = placeholderDetail();
      }
      onProgress?.(`Loading classes (${index + 1}/${classes.length})…`);
    },
  );

  const late = attendanceRecords.filter((r) =>
    /^[LT]/i.test(r.code.trim()),
  ).length;
  const absent = attendanceRecords.filter((r) =>
    /^A/i.test(r.code.trim()),
  ).length;

  const attendance: AttendanceData = {
    summary: [
      { id: 'present', label: 'Present', value: '–' },
      { id: 'late', label: 'Late', value: String(late) },
      { id: 'absent', label: 'Absent', value: String(absent) },
    ],
    byClass: courses.map((c) => ({
      id: c.id,
      course: c.name,
      instructor: c.teacher,
      record: '–',
    })),
    recent: recentAttendance.slice(0, 8).map((r, i) => ({
      id: `live-recent-${i}`,
      date: r.date,
      detail: r.detail,
      status: r.status,
    })),
  };

  const transcript: TranscriptData = { terms: [] };
  const byYear = new Map<string, TranscriptEntry[]>();
  for (const e of transcriptEntries) {
    if (!byYear.has(e.year)) byYear.set(e.year, []);
    byYear.get(e.year)!.push(e);
  }
  let t = 0;
  for (const [year, entries] of byYear) {
    transcript.terms.push({
      id: `live-term-${t++}`,
      label: year,
      courses: entries.map((e, i) => ({
        id: `live-tr-${t}-${i}`,
        name: e.course,
        detail: `Grade ${e.grade}`,
        grade: parseGradeValue(e.finalGrade),
      })),
    });
  }

  const upcoming: UpcomingItem[] = calendar.events.slice(0, 12).map((e, i) => ({
    id: `live-up-${i}`,
    title: e.name,
    course: e.section,
    date: formatUpcomingDate(e.date),
  }));

  // Timetable: prefer the Aspen schedule page; fall back to the class list
  // (same blocks/teachers/rooms, no days) so the screen is never empty.
  const schedule: ScheduleData = {
    entries: (scheduleEntries.length > 0
      ? scheduleEntries.map((e, i) => ({
          id: `live-sch-${i}`,
          course: e.course,
          block: e.block || classes[i]?.term || '',
          teacher: e.teacher,
          room: e.room,
          term: e.term,
          days: e.days,
        }))
      : classes.map((c) => ({
          id: c.oid,
          course: c.name,
          block: c.term,
          teacher: c.teacher,
          room: c.room,
          term: c.term,
          days: '',
        }))
    ).sort((a, b) => a.block.localeCompare(b.block)),
  };

  return {
    termLabel,
    displayName: profile.displayName,
    schoolLine: profile.schoolLine,
    studentId: profile.studentId,
    courses,
    details,
    attendance,
    upcoming,
    transcript,
    schedule,
    recentAttendance,
  };
}

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = '';
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

/* ---------------- provider mapping ---------------- */

export function snapshotToProvider(snapshot: LiveSnapshot): SchoolProvider {
  const average = (list: Course[]): number => {
    const graded = list.filter((c) => c.grade > 0);
    const basis = graded.length > 0 ? graded : list;
    if (basis.length === 0) return 0;
    return basis.reduce((sum, c) => sum + c.grade, 0) / basis.length;
  };
  return {
    id: 'myed-live',
    name: 'MyEducation BC (Follett Aspen)',
    profile: {
      initials: snapshot.displayName
        .split(' ')
        .map((p) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2),
      name: snapshot.displayName,
      detail: snapshot.schoolLine,
    },
    term: { label: snapshot.termLabel },
    courses: snapshot.courses,
    letterFor: bcLetterFor,
    roomLabel: (room) => (/^\d/.test(room) ? `Rm ${room}` : room),
    termAverage: () => average(snapshot.courses),
    courseDetail: (courseId) => snapshot.details[courseId] ?? placeholderDetail(),
    attendance: snapshot.attendance,
    upcoming: snapshot.upcoming ?? [],
    schedule:
      snapshot.schedule && snapshot.schedule.entries.length > 0
        ? snapshot.schedule
        : {
            // Restored sessions predate the schedule field (or the schedule
            // page didn't parse): derive the timetable from the live course
            // list so the screen is never blank while classes exist.
            entries: snapshot.courses.map((c) => ({
              id: c.id,
              course: c.name,
              block: c.block,
              teacher: c.teacher,
              room: c.room,
              term: snapshot.termLabel,
              days: '',
            })),
          },
    transcript: snapshot.transcript,
  };
}

/* ---------------- on-demand detail (restored sessions) ---------------- */

const detailCache = new Map<string, CourseDetail>();

/** Refetch one class's detail with a live session (refreshes class list first). */
export async function ensureCourseDetail(
  core: LiveCore,
  courseId: string,
  preferredTerm: string,
  recentAttendance: { date: string; detail: string; status: string }[],
): Promise<CourseDetail> {
  const cached = detailCache.get(courseId);
  if (cached) return cached;
  const session: LiveSession = {
    cookies: core.cookies,
    formData: core.formData,
  };
  // Refresh the Struts form token first — stored ones expire with the session.
  await getClasses(session);
  core.cookies = session.cookies;
  core.formData = session.formData;
  const [d, a] = await withSelectedClass(session, courseId, async (s) => {
    const [detail, assigns] = await Promise.all([
      getClassDetail(s),
      getAssignments(s),
    ]);
    return [detail, assigns] as const;
  });
  core.cookies = session.cookies;
  core.formData = session.formData;
  const mapped = detailFromLive(
    courseId,
    preferredTerm,
    d,
    a,
    recentAttendance.slice(0, 8),
  );
  detailCache.set(courseId, mapped);
  return mapped;
}

export function useLiveCourseDetail(
  session: AuthSession | null,
  courseId: string,
): { detail: CourseDetail | null; loading: boolean; error: boolean } {
  const [state, setState] = useState<{
    detail: CourseDetail | null;
    loading: boolean;
    error: boolean;
  }>({ detail: null, loading: false, error: false });

  useEffect(() => {
    if (!session || session.kind !== 'live') {
      setState({ detail: null, loading: false, error: false });
      return;
    }
    const snapshot = session.snapshot;
    if (!snapshot) {
      setState({ detail: null, loading: false, error: true });
      return;
    }
    const existing = snapshot.details[courseId];
    if (existing && existing.categories.length > 0) {
      setState({ detail: null, loading: false, error: false });
      return;
    }
    let live = true;
    setState({ detail: null, loading: true, error: false });
    const core = session.core;
    if (!snapshot || !core) {
      setState({ detail: null, loading: false, error: true });
      return () => {
        live = false;
      };
    }
    const course = snapshot.courses.find((c) => c.id === courseId);
    ensureCourseDetail(core, courseId, course?.block ?? '', snapshot.recentAttendance)
      .then((detail) => {
        if (!live) return;
        snapshot.details[courseId] = detail;
        setState({ detail, loading: false, error: false });
      })
      .catch(() => {
        if (!live) return;
        setState({ detail: null, loading: false, error: true });
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token, courseId]);

  return state;
}
