import * as SecureStore from 'expo-secure-store';

import { MyEdProvider } from '@/providers/myed';
import type { SchoolProvider } from '@/providers/types';
import {
  getFamilyStudents,
  liveLogin,
  selectStudent,
  samePerson,
  type FamilyStudent,
} from '@/providers/myed/live-client';
import {
  buildLiveSnapshot,
  snapshotToProvider,
  type LiveCore,
  type LiveSnapshot,
} from '@/providers/myed/live-store';

/**
 * Sign-in backend: live MyEducation BC (Follett Aspen) first, mock demo
 * accounts as an offline fallback.
 *
 * - Real credentials → REST `/app/rest/auth` + SSO exchange (see
 *   `myed/live-client.ts`, ported from better-myed), then a full data
 *   snapshot (profile, classes, per-class details, attendance, transcript,
 *   calendar) is pulled and cached in the session.
 * - `demo` / `judokim` mock accounts keep working with zero network.
 *
 * Everything downstream (AuthContext, screens) stays identical: screens
 * render from `SchoolProvider`, built from the live snapshot when present.
 */

export type AuthSession = {
  kind: 'mock' | 'live';
  token: string;
  studentId: string;
  displayName: string;
  school: string;
  expiresAt: number;
  /** Login ID used for this session (live relogin/snapshot rebuilds). */
  username?: string;
  /** Live Aspen session cookies + Struts form token. */
  core?: LiveCore;
  /** Live data snapshot for the active student. May be partial on restore. */
  snapshot?: LiveSnapshot;
  /** Children on a parent (family) account. Absent for student accounts. */
  students?: FamilyStudent[];
  /** Active child id. Undefined for single-student sessions. */
  activeStudentId?: string;
  /**
   * Per-student snapshots, memory-only (stripped on persist to keep
   * SecureStore small; evicted students refetch on demand).
   */
  studentSnapshots?: Record<string, LiveSnapshot>;
};

/** Backwards-compatible alias. */
export type MockSession = AuthSession;

export type SignInError = {
  code: 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED' | 'NETWORK';
  message: string;
  /** Remaining attempts before lockout. Present on INVALID_CREDENTIALS. */
  attemptsLeft?: number;
};

const SESSION_KEY = 'marks.auth-session';
const LEGACY_SESSION_KEY = 'marks.mock-session';
const LIVE_TIMEOUT_MS = 25000;

const MOCK_USERS = [
  {
    username: 'judokim',
    password: 'marks4080',
    studentId: '1004821',
    displayName: 'Jude Kim',
    school: 'Lincoln Secondary · Grade 10',
  },
  {
    username: 'demo',
    password: 'demo1234',
    studentId: '1000000',
    displayName: 'Demo Student',
    school: 'Lincoln Secondary · Grade 10',
  },
] as const;

const failedAttempts = new Map<string, number>();

function mockLatency(): Promise<void> {
  const ms = 600 + Math.random() * 500;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function mockSignInResult(
  username: string,
  password: string,
): AuthSession | SignInError {
  const user = username.trim().toLowerCase();
  const record = MOCK_USERS.find((u) => u.username === user);

  // Unknown to the mock table: likely a real Aspen user whose live attempt
  // already failed. Never burn lockout tries on them — report it straight.
  if (!record) {
    return {
      code: 'INVALID_CREDENTIALS',
      message: 'Student ID or password is incorrect.',
    };
  }

  const attempts = failedAttempts.get(user) ?? 0;
  if (attempts >= 5) {
    return {
      code: 'ACCOUNT_LOCKED',
      message: 'Too many attempts. Try again in 15 minutes.',
    };
  }

  if (record.password !== password) {
    failedAttempts.set(user, attempts + 1);
    const left = 5 - (attempts + 1);
    return {
      code: 'INVALID_CREDENTIALS',
      message:
        left > 0
          ? `Student ID or password is incorrect. ${left} ${left === 1 ? 'try' : 'tries'} left.`
          : 'Student ID or password is incorrect.',
      attemptsLeft: Math.max(0, left),
    };
  }

  failedAttempts.delete(user);
  return {
    kind: 'mock',
    token: `mock_${record.studentId}_${Date.now().toString(36)}`,
    studentId: record.studentId,
    displayName: record.displayName,
    school: record.school,
    expiresAt: Date.now() + 1000 * 60 * 60 * 8,
  };
}

export async function signIn(
  username: string,
  password: string,
  onProgress?: (label: string) => void,
): Promise<AuthSession> {
  // Live MyEd attempt first — real credentials verify against Aspen.
  // A throw means network/timeout (not wrong creds); only a null return
  // means Aspen rejected the password.
  let liveThrew: unknown = null;
  try {
    onProgress?.('Contacting MyEd…');
    const live = await withTimeout(liveLogin(username, password), LIVE_TIMEOUT_MS);
    if (live) {
      const core: LiveCore = {
        cookies: live.cookies,
        formData: live.formData,
      };
      // Parent accounts land without a student context (empty class list).
      // Discover linked children first and open one before pulling data.
      let students: FamilyStudent[] = [];
      try {
        onProgress?.('Finding your students…');
        const probe = { cookies: core.cookies, formData: core.formData };
        students = await getFamilyStudents(probe);
        core.cookies = probe.cookies;
        core.formData = probe.formData;
        if (students.length > 0) {
          onProgress?.(`Opening ${students[0].name}…`);
          const sel = { cookies: core.cookies, formData: core.formData };
          if (await selectStudent(sel, students[0])) {
            core.cookies = sel.cookies;
            core.formData = sel.formData;
          }
        }
      } catch {
        students = [];
      }
      const snapshot = await buildLiveSnapshot(username, core, onProgress);
      const session: AuthSession = {
        kind: 'live',
        token: `live_${Date.now().toString(36)}`,
        studentId: snapshot.studentId,
        displayName: snapshot.displayName,
        school: snapshot.schoolLine,
        // Aspen sessions are server-side; revalidate hourly via home.do.
        expiresAt: Date.now() + 1000 * 60 * 60 * 8,
        username: username.trim(),
        core,
        snapshot,
      };
      if (students.length >= 1) {
        session.students = students;
        const match =
          students.find((s) => samePerson(s.name, snapshot.displayName)) ??
          students[0];
        // If the opened child isn't the match, switch + rebuild once.
        if (match.id !== students[0].id) {
          try {
            const sel = { cookies: core.cookies, formData: core.formData };
            if (await selectStudent(sel, match)) {
              core.cookies = sel.cookies;
              core.formData = sel.formData;
              const rebuilt = await buildLiveSnapshot(username, core, onProgress);
              session.snapshot = rebuilt;
              session.studentId = rebuilt.studentId;
              session.displayName = rebuilt.displayName;
              session.school = rebuilt.schoolLine;
            }
          } catch {
            // Keep the first child's snapshot.
          }
        }
        session.activeStudentId = match.id;
        if (session.snapshot) {
          session.studentSnapshots = {
            [match.id]: session.snapshot,
          };
        }
      }
      onProgress?.('Done');
      return session;
    }
  } catch (e) {
    // Network/timeout/parsing failure — remember it so a real user with a
    // flaky connection gets a network error, not a wrong-password error.
    liveThrew = e;
    if (__DEV__) console.log('[auth] live login failed, trying mock:', e);
  }

  await mockLatency();
  // Offline demo path: the mock table keeps working with zero network.
  // A wrong live password returns null (not a throw), which falls through
  // to the mock check below and surfaces INVALID_CREDENTIALS when nothing
  // matches. A live network failure surfaces NETWORK instead — unless the
  // demo creds match, which always work offline.
  const mockResult = mockSignInResult(username, password);
  if (!('code' in mockResult)) return mockResult;
  if (liveThrew) {
    throw {
      code: 'NETWORK',
      message: 'Could not reach MyEd. Check your connection and try again.',
    } satisfies SignInError;
  }
  throw mockResult;
}

export async function signOut(_token: string): Promise<void> {
  // Aspen server-side session is dropped by discarding cookies client-side.
  await mockLatency();
}

/**
 * Switch a live parent session to another child: flip the server-side
 * student context, then rebuild that child's data snapshot.
 * Mutates + returns the session; caller persists + re-renders.
 */
export async function switchActiveStudent(
  session: AuthSession,
  studentId: string,
  onProgress?: (label: string) => void,
): Promise<AuthSession> {
  if (session.kind !== 'live' || !session.core || !session.students) {
    throw new Error('No live parent session to switch.');
  }
  const target = session.students.find((s) => s.id === studentId);
  if (!target) throw new Error('Unknown student.');
  if (session.activeStudentId === studentId && session.snapshot) {
    return session;
  }

  // Stash the outgoing child's snapshot in memory.
  const currentId = session.activeStudentId;
  if (currentId && session.snapshot) {
    session.studentSnapshots = {
      ...(session.studentSnapshots ?? {}),
      [currentId]: session.snapshot,
    };
  }
  const cached = session.studentSnapshots?.[studentId];
  if (cached) {
    session.snapshot = cached;
    session.activeStudentId = studentId;
    session.studentId = cached.studentId;
    session.displayName = cached.displayName;
    session.school = cached.schoolLine;
    await persistSession(session);
    return session;
  }

  onProgress?.(`Switching to ${target.name}…`);
  const probe = {
    cookies: session.core.cookies,
    formData: session.core.formData,
  };
  const switched = await selectStudent(probe, target);
  session.core.cookies = probe.cookies;
  session.core.formData = probe.formData;
  if (!switched) {
    throw new Error(`Could not switch to ${target.name} in MyEd.`);
  }
  const snapshot = await buildLiveSnapshot(
    session.username ?? session.studentId,
    session.core,
    onProgress,
  ).catch((e) => {
    throw new Error(
      `Switched to ${target.name} but could not load their data: ${e instanceof Error ? e.message : 'network error'}`,
    );
  });
  session.snapshot = snapshot;
  session.activeStudentId = studentId;
  session.studentId = snapshot.studentId;
  session.displayName = snapshot.displayName;
  session.school = snapshot.schoolLine;
  session.studentSnapshots = {
    ...(session.studentSnapshots ?? {}),
    [studentId]: snapshot,
  };
  onProgress?.('Done');
  await persistSession(session);
  return session;
}

/**
 * Re-run child discovery for a live session (e.g. opening settings when no
 * children were found at login). Updates + persists students/activeStudentId.
 * Returns true when 1+ children are now known. Throws with a human-readable
 * reason when discovery fails so settings can show it instead of silence.
 */
export async function refreshFamilyStudents(
  session: AuthSession,
  onProgress?: (label: string) => void,
): Promise<boolean> {
  if (session.kind !== 'live' || !session.core) return false;
  const probe = {
    cookies: session.core.cookies,
    formData: session.core.formData,
  };
  let students: FamilyStudent[];
  try {
    students = await getFamilyStudents(probe);
  } catch (e) {
    throw new Error(
      e instanceof Error ? e.message : 'Could not reach MyEd.',
    );
  }
  session.core.cookies = probe.cookies;
  session.core.formData = probe.formData;
  if (students.length >= 1) {
    session.students = students;
    const match =
        students.find((s) =>
          samePerson(s.name, session.snapshot?.displayName ?? session.displayName),
        ) ?? students[0];
      session.activeStudentId = match.id;
      const courseCount = session.snapshot?.courses.length ?? 0;
      if (courseCount === 0) {
        // Empty snapshot (parent login predates child selection): open the
        // matched child and pull their data now so the app isn't blank.
        try {
          const sel = {
            cookies: session.core.cookies,
            formData: session.core.formData,
          };
          onProgress?.(`Opening ${match.name}…`);
          if (await selectStudent(sel, match)) {
            session.core.cookies = sel.cookies;
            session.core.formData = sel.formData;
            const rebuilt = await buildLiveSnapshot(
              session.username ?? session.studentId,
              session.core,
              onProgress,
            );
            session.snapshot = rebuilt;
            session.studentId = rebuilt.studentId;
            session.displayName = rebuilt.displayName;
            session.school = rebuilt.schoolLine;
          }
        } catch {
          // Keep whatever snapshot exists; dropdown still works.
        }
      } else if (session.snapshot) {
        session.studentSnapshots = {
          ...(session.studentSnapshots ?? {}),
          [match.id]: session.snapshot,
        };
      }
      await persistSession(session);
      return true;
  }
  await persistSession(session);
  return false;
}

/**
 * Rebuild the live snapshot for the current session (e.g. pull-to-refresh
 * after MyEd publishes new data). Mutates + persists + returns the session.
 */
export async function refreshLiveSnapshot(
  session: AuthSession,
  onProgress?: (label: string) => void,
): Promise<AuthSession> {
  if (session.kind !== 'live' || !session.core) {
    throw new Error('No live session to refresh.');
  }
  const snapshot = await buildLiveSnapshot(
    session.username ?? session.studentId,
    session.core,
    onProgress,
  );
  session.snapshot = snapshot;
  session.studentId = snapshot.studentId;
  session.displayName = snapshot.displayName;
  session.school = snapshot.schoolLine;
  if (session.activeStudentId) {
    session.studentSnapshots = {
      ...(session.studentSnapshots ?? {}),
      [session.activeStudentId]: snapshot,
    };
  }
  onProgress?.('Done');
  await persistSession(session);
  return session;
}

export function providerForSession(session: AuthSession): SchoolProvider {
  if (session.kind === 'live' && session.snapshot) {
    try {
      return snapshotToProvider(session.snapshot);
    } catch {
      // Corrupt snapshot — fall back to the static provider shell.
    }
  }
  return {
    ...MyEdProvider,
    profile: {
      initials: session.displayName
        .split(' ')
        .map((p) => p[0])
        .join('')
        .toUpperCase(),
      name: session.displayName,
      detail: session.school,
    },
  };
}

/* ---------------- persistence ---------------- */

function isValidSession(session: AuthSession): boolean {
  return !!session.token && session.expiresAt > Date.now();
}

/** Strip bulky per-class details when the snapshot is too big to store. */
function stripDetails(session: AuthSession): AuthSession {
  if (session.kind !== 'live' || !session.snapshot) return session;
  return {
    ...session,
    snapshot: { ...session.snapshot, details: {} },
  };
}

/** studentSnapshots is memory-only — never persist the whole family. */
function stripEphemeral(session: AuthSession): AuthSession {
  if (session.kind !== 'live') return session;
  const { studentSnapshots: _dropped, ...rest } = session;
  void _dropped;
  return rest;
}

export async function persistSession(session: AuthSession): Promise<void> {
  const lean = stripEphemeral(session);
  try {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(lean));
  } catch {
    // Snapshot too large for SecureStore — persist without per-class
    // details (course screens refetch them on demand).
    try {
      await SecureStore.setItemAsync(
        SESSION_KEY,
        JSON.stringify(stripDetails(lean)),
      );
    } catch {
      // Web / unsupported platform: session stays in memory only.
    }
  }
}

export async function clearStoredSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch {
    // Ignore — nothing persisted on this platform.
  }
  try {
    await SecureStore.deleteItemAsync(LEGACY_SESSION_KEY);
  } catch {
    // Ignore legacy key.
  }
}

export async function loadStoredSession(): Promise<AuthSession | null> {
  try {
    const raw =
      (await SecureStore.getItemAsync(SESSION_KEY)) ??
      (await SecureStore.getItemAsync(LEGACY_SESSION_KEY));
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (!isValidSession(session)) {
      await clearStoredSession();
      return null;
    }
    if (!session.kind) session.kind = 'mock';
    // Per-student snapshots are memory-only; start empty on restore.
    if (session.kind === 'live') {
      session.studentSnapshots = {};
      // Legacy restores predate the switcher: single-student mode.
      if (session.students && session.students.length < 2) {
        session.students = undefined;
        session.activeStudentId = undefined;
      }
    }
    return session;
  } catch {
    return null;
  }
}
