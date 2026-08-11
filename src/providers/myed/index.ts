import type {
  Course,
  CourseDetail,
  SchoolProvider,
} from '@/providers/types';

/**
 * MyEducation BC (Follett Aspen) — the first-class provider.
 *
 * Currently serves a sample schedule standing in for a real MyEd pull;
 * swapping in the live fetch (auth + Aspen endpoints) changes this file only.
 * The BC provincial letter scale and `Rm`/block conventions live here because
 * they are MyEd domain rules, not app rules.
 */

const COURSES: Course[] = [
  { id: 'ss10', name: 'Socials 10 Advanced Credit', block: 'A', teacher: 'Ms. Whitfield', room: '217', grade: 88, symbol: 'globe' },
  { id: 'pc11', name: 'Pre-Calculus 11', block: 'B', teacher: 'Mr. Okonkwo', room: '104', grade: 91, symbol: 'function' },
  { id: 'ch11', name: 'Chemistry 11', block: 'C', teacher: 'Dr. Vasquez', room: '302', grade: 84, symbol: 'flask.fill' },
  { id: 'en10', name: 'English 10', block: 'D', teacher: 'Ms. Laurier', room: '118', grade: 90, symbol: 'book.closed.fill' },
  { id: 'pe10', name: 'Physical Education 10', block: 'E', teacher: 'Mr. Doyle', room: 'Gym', grade: 96, symbol: 'figure.run' },
  { id: 'cs11', name: 'Computer Programming 11', block: 'F', teacher: 'Ms. Halvorsen', room: '211', grade: 94, symbol: 'chevron.left.forwardslash.chevron.right' },
  { id: 'fr10', name: 'French 10', block: 'G', teacher: 'Mme Beaulieu', room: '126', grade: 79, symbol: 'text.bubble.fill' },
  { id: 'mu10', name: 'Concert Band 10', block: 'H', teacher: 'Mr. Tanaka', room: 'Band Room', grade: 93, symbol: 'music.note' },
];

/** BC provincial letter scale. */
function letterFor(grade: number): string {
  if (grade >= 86) return 'A';
  if (grade >= 73) return 'B';
  if (grade >= 67) return 'C+';
  if (grade >= 60) return 'C';
  if (grade >= 50) return 'C-';
  return 'F';
}

/** Same categories/assignments for every course until MyEd exposes them. */
const COURSE_DETAIL: CourseDetail = {
  updated: 'Updated Aug 8',
  categories: [
    { id: 'tests', name: 'Tests', weight: '40%', score: 89.2, display: '89.2', letter: letterFor(89.2) },
    { id: 'labs', name: 'Labs', weight: '30%', score: 95.1, display: '95.1', letter: letterFor(95.1) },
    { id: 'homework', name: 'Homework', weight: '20%', score: 98.0, display: '98.0', letter: letterFor(98) },
    { id: 'participation', name: 'Participation', weight: '10%', score: 100, display: '100', letter: letterFor(100) },
  ],
  assignments: [
    { id: 'a1', name: 'Unit 5 Test — Thermodynamics', date: 'Aug 6', score: '89/100' },
    { id: 'a2', name: 'Lab: Calorimetry', date: 'Aug 4', score: '19/20' },
    { id: 'a3', name: 'Problem Set 12', date: 'Jul 31', score: '10/10' },
    { id: 'a4', name: 'Quiz: Enthalpy', date: 'Jul 29', score: '17/20' },
    { id: 'a5', name: "Lab: Hess's Law", date: 'Jul 24', score: '20/20' },
    { id: 'a6', name: 'Problem Set 11', date: 'Jul 22', score: null },
  ],
  attendance: {
    summary: [
      { id: 'present', label: 'Present', value: '62' },
      { id: 'late', label: 'Late', value: '2' },
      { id: 'absent', label: 'Absent', value: '3' },
    ],
    records: [
      { id: 'r1', date: 'Aug 5', detail: 'Block C · 8 min', status: 'Late' },
      { id: 'r2', date: 'Jul 28', detail: 'Full day · Excused', status: 'Absent' },
      { id: 'r3', date: 'Jul 15', detail: 'Block C · 4 min', status: 'Late' },
      { id: 'r4', date: 'Jul 2', detail: 'Full day · Unexcused', status: 'Absent' },
      { id: 'r5', date: 'Jun 20', detail: 'Full day · Excused', status: 'Absent' },
    ],
  },
};

export const MyEdProvider: SchoolProvider = {
  id: 'myed',
  name: 'MyEducation BC (Follett Aspen)',
  profile: {
    initials: 'JK',
    name: 'Jude Kim',
    detail: 'Lincoln Secondary · Grade 10',
  },
  term: { label: 'Term 1' },
  courses: COURSES,
  letterFor,
  roomLabel: (room) => (/^\d/.test(room) ? `Rm ${room}` : room),
  termAverage: () =>
    COURSES.reduce((sum, course) => sum + course.grade, 0) / COURSES.length,
  courseDetail: () => COURSE_DETAIL,
  attendance: {
    summary: [
      { id: 'present', label: 'Present', value: '341' },
      { id: 'late', label: 'Late', value: '6' },
      { id: 'absent', label: 'Absent', value: '8' },
    ],
    byClass: [
      { id: 'ss10', course: 'Socials 10 Advanced Credit', instructor: 'Ms. Whitfield', record: '1 late' },
      { id: 'ch11', course: 'Chemistry 11', instructor: 'Dr. Vasquez', record: '3 absent · 2 late' },
      { id: 'en10', course: 'English 10', instructor: 'Ms. Laurier', record: '2 absent' },
      { id: 'pe10', course: 'Physical Education 10', instructor: 'Mr. Doyle', record: 'Perfect' },
      { id: 'fr10', course: 'French 10', instructor: 'Mme Beaulieu', record: '3 absent · 3 late' },
    ],
    recent: [
      { id: 'r1', date: 'Aug 5', detail: 'Chemistry 11 · Block C', status: 'Late' },
      { id: 'r2', date: 'Jul 28', detail: 'Full day · Excused', status: 'Absent' },
      { id: 'r3', date: 'Jul 15', detail: 'French 10 · Block G', status: 'Late' },
      { id: 'r4', date: 'Jul 2', detail: 'Full day · Unexcused', status: 'Absent' },
    ],
  },
  upcoming: [
    { id: 'u1', title: 'Unit 6 Quiz', course: 'Chemistry 11', date: 'Aug 12' },
    { id: 'u2', title: 'Essay Draft', course: 'English 10', date: 'Aug 14' },
    { id: 'u3', title: 'Lab Report: Kinetics', course: 'Chemistry 11', date: 'Aug 18' },
    { id: 'u4', title: 'Problem Set 13', course: 'Pre-Calculus 11', date: 'Aug 21' },
  ],
  transcript: {
    terms: [
      {
        id: 'term1-2627',
        label: 'Term 1 · 2026–27',
        courses: COURSES.map((course) => ({
          id: course.id,
          name: course.name,
          detail: course.teacher,
          grade: course.grade,
        })),
      },
      {
        id: 'term4-2526',
        label: 'Term 4 · 2025–26',
        courses: [
          { id: 'p1', name: 'English 9', detail: 'Ms. Laurier', grade: 90 },
          { id: 'p2', name: 'Science 9', detail: 'Dr. Vasquez', grade: 93 },
          { id: 'p3', name: 'Mathematics 9', detail: 'Mr. Okonkwo', grade: 91 },
          { id: 'p4', name: 'Socials 9', detail: 'Ms. Whitfield', grade: 87 },
          { id: 'p5', name: 'French 9', detail: 'Mme Beaulieu', grade: 81 },
          { id: 'p6', name: 'Physical Education 9', detail: 'Mr. Doyle', grade: 95 },
        ],
      },
    ],
  },
};
