import type { SFSymbol } from 'expo-symbols';

/**
 * The contract every school-system provider implements. Marks renders ONLY
 * from this interface — screens never import a provider's internals — so
 * adding a school system (PowerSchool, Infinite Campus, …) means implementing
 * this type in `src/providers/<system>/` and registering it in `registry.ts`.
 *
 * The current shape is a synchronous snapshot; async fetch/refresh lands on
 * the provider (not the screens) when real network providers arrive.
 */
export type SchoolProvider = {
  /** Stable id, e.g. `'myed'`. */
  id: string;
  /** Human-readable system name shown in settings. */
  name: string;
  profile: Profile;
  /** Current reporting period, e.g. `{ label: 'Term 1' }`. */
  term: { label: string };
  courses: Course[];
  /** Grade → letter under this system's scale (BC provincial, GPA letters, …). */
  letterFor(grade: number): string;
  /** Room display rule, e.g. `'217'` → `'Rm 217'`. */
  roomLabel(room: string): string;
  /** Mean course grade for the current term. */
  termAverage(): number;
  /** Categories, assignments, and per-course attendance for one course. */
  courseDetail(courseId: string): CourseDetail;
  attendance: AttendanceData;
  /** Dated assessments for the calendar. */
  upcoming: UpcomingItem[];
  transcript: TranscriptData;
};

export type Profile = {
  initials: string;
  name: string;
  /** e.g. `'Lincoln Secondary · Grade 10'`. */
  detail: string;
};

export type Course = {
  id: string;
  name: string;
  /** Timetable slot label — MyEd blocks `A`–`H`, periods elsewhere. */
  block: string;
  teacher: string;
  room: string;
  /** Term percentage. */
  grade: number;
  symbol: SFSymbol;
};

export type CourseDetail = {
  /** e.g. `'Updated Aug 8'`. */
  updated: string;
  categories: GradeCategory[];
  assignments: Assignment[];
  attendance: {
    summary: Stat[];
    records: AttendanceRecord[];
  };
};

export type GradeCategory = {
  id: string;
  name: string;
  /** Display weight, e.g. `'40%'`. */
  weight: string;
  /** Percentage score, drives the progress bar. */
  score: number;
  display: string;
  letter: string;
};

export type Assignment = {
  id: string;
  name: string;
  date: string;
  /** `'89/100'`, or null when not graded yet. */
  score: string | null;
};

export type Stat = { id: string; label: string; value: string };

export type AttendanceRecord = {
  id: string;
  date: string;
  detail: string;
  status: string;
};

export type AttendanceData = {
  summary: Stat[];
  byClass: { id: string; course: string; instructor: string; record: string }[];
  recent: AttendanceRecord[];
};

export type UpcomingItem = {
  id: string;
  title: string;
  course: string;
  date: string;
};

export type TranscriptData = {
  terms: {
    id: string;
    label: string;
    courses: { id: string; name: string; detail: string; grade: number }[];
  }[];
};
