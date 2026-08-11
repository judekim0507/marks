import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PressableHighlight } from '@/components/pressable-highlight';
import { SegmentedControl } from '@/components/segmented-control';
import { SquircleView } from '@/components/squircle-view';
import { useAppTheme } from '@/components/theme-context';
import { Fonts, type AppTheme } from '@/constants/theme';

const COURSE = {
  name: 'AP Chemistry',
  detail: 'Dr. Sarah Chen · Period 3 · Room 214',
  grade: '92.4%',
  letter: 'A',
  term: 'Term 1',
  updated: 'Updated Aug 8',
};

const CATEGORIES = [
  { id: 'tests', name: 'Tests', weight: '40%', score: 89.2, display: '89.2', letter: 'B+' },
  { id: 'labs', name: 'Labs', weight: '30%', score: 95.1, display: '95.1', letter: 'A' },
  { id: 'homework', name: 'Homework', weight: '20%', score: 98.0, display: '98.0', letter: 'A+' },
  { id: 'participation', name: 'Participation', weight: '10%', score: 100, display: '100', letter: 'A+' },
];

const ASSIGNMENTS = [
  { id: 'a1', name: 'Unit 5 Test — Thermodynamics', date: 'Aug 6', score: '89/100' },
  { id: 'a2', name: 'Lab: Calorimetry', date: 'Aug 4', score: '19/20' },
  { id: 'a3', name: 'Problem Set 12', date: 'Jul 31', score: '10/10' },
  { id: 'a4', name: 'Quiz: Enthalpy', date: 'Jul 29', score: '17/20' },
  { id: 'a5', name: "Lab: Hess's Law", date: 'Jul 24', score: '20/20' },
  { id: 'a6', name: 'Problem Set 11', date: 'Jul 22', score: null },
];

const ATTENDANCE_SUMMARY = [
  { id: 'present', label: 'Present', value: '62' },
  { id: 'late', label: 'Late', value: '2' },
  { id: 'absent', label: 'Absent', value: '3' },
];

const ATTENDANCE_RECORDS = [
  { id: 'r1', date: 'Aug 5', detail: 'Period 3 · 8 min', status: 'Late' },
  { id: 'r2', date: 'Jul 28', detail: 'Full day · Excused', status: 'Absent' },
  { id: 'r3', date: 'Jul 15', detail: 'Period 3 · 4 min', status: 'Late' },
  { id: 'r4', date: 'Jul 2', detail: 'Full day · Unexcused', status: 'Absent' },
  { id: 'r5', date: 'Jun 20', detail: 'Full day · Excused', status: 'Absent' },
];

type CourseTab = 'overview' | 'attendance';

function cardCorners(index: number, count: number) {
  if (index === 0) return { topLeft: 24, topRight: 24 };
  if (index === count - 1) return { bottomLeft: 24, bottomRight: 24 };
  return undefined;
}

export default function CourseScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [tab, setTab] = useState<CourseTab>('overview');
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.course}>{COURSE.name}</Text>
        <Text style={styles.courseDetail}>{COURSE.detail}</Text>
      </View>

      <View style={styles.segmentWrap}>
        <SegmentedControl
          options={[
            { label: 'Overview', value: 'overview' },
            { label: 'Attendance', value: 'attendance' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {tab === 'attendance' && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>This Term</Text>
            <SquircleView
              style={styles.card}
              backgroundColor={theme.card}
              cornerRadius={24}
              cornerSmoothing={0.75}>
              <View style={styles.summaryRow}>
                {ATTENDANCE_SUMMARY.map((stat) => (
                  <View key={stat.id} style={styles.summaryStat}>
                    <Text style={styles.summaryValue}>{stat.value}</Text>
                    <Text style={styles.summaryLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            </SquircleView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Recent</Text>
            <SquircleView
              style={styles.card}
              backgroundColor={theme.card}
              cornerRadius={24}
              cornerSmoothing={0.75}>
              {ATTENDANCE_RECORDS.map((record, index) => (
                <View
                  key={record.id}
                  style={[
                    styles.assignmentRow,
                    styles.recordRow,
                    index < ATTENDANCE_RECORDS.length - 1 && styles.rowBorder,
                  ]}>
                  <View style={styles.assignmentInner}>
                    <View style={styles.assignmentInfo}>
                      <Text style={styles.rowTitle}>{record.date}</Text>
                      <Text style={styles.rowSub}>{record.detail}</Text>
                    </View>
                    <Text style={styles.rowScore}>{record.status}</Text>
                  </View>
                </View>
              ))}
            </SquircleView>
          </View>
        </>
      )}

      {tab === 'overview' && (
        <>
      <View style={styles.section}>
        <View style={styles.sectionLabelRow}>
          <Text style={styles.sectionLabel}>Report Card</Text>
          <Text style={styles.sectionLabelDetail}>{COURSE.term}</Text>
        </View>
        <SquircleView
          style={styles.card}
          backgroundColor={theme.card}
          cornerRadius={24}
          cornerSmoothing={0.75}>
          <View style={styles.reportCard}>
            <View style={styles.reportInfo}>
              <Text style={styles.reportGrade}>{COURSE.grade}</Text>
              <Text style={styles.reportCaption}>{COURSE.updated}</Text>
            </View>
            <Text style={styles.reportLetter}>{COURSE.letter}</Text>
          </View>
        </SquircleView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Posted Grades</Text>
        <SquircleView
          style={styles.card}
          backgroundColor={theme.card}
          cornerRadius={24}
          cornerSmoothing={0.75}>
          {CATEGORIES.map((category, index) => (
            <View
              key={category.id}
              style={[
                styles.categoryRow,
                index < CATEGORIES.length - 1 && styles.rowBorder,
              ]}>
              <View style={styles.categoryTop}>
                <Text style={styles.rowTitle}>
                  {category.name}
                  <Text style={styles.categoryWeight}>  {category.weight}</Text>
                </Text>
                <Text style={styles.rowScore}>
                  {category.display}
                  <Text style={styles.categoryLetter}>  {category.letter}</Text>
                </Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[styles.trackFill, { width: `${category.score}%` }]}
                />
              </View>
            </View>
          ))}
        </SquircleView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Assignments</Text>
        <SquircleView
          style={styles.card}
          backgroundColor={theme.card}
          cornerRadius={24}
          cornerSmoothing={0.75}>
          {ASSIGNMENTS.map((assignment, index) => (
            <PressableHighlight
              key={assignment.id}
              style={[
                styles.assignmentRow,
                index < ASSIGNMENTS.length - 1 && styles.rowBorder,
              ]}
              contentStyle={styles.assignmentContent}
              cornerSmoothing={0.75}
              cornerRadii={cardCorners(index, ASSIGNMENTS.length)}>
              <View style={styles.assignmentInner}>
                <View style={styles.assignmentInfo}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {assignment.name}
                  </Text>
                  <Text style={styles.rowSub}>{assignment.date}</Text>
                </View>
                <Text
                  style={
                    assignment.score ? styles.rowScore : styles.rowScoreEmpty
                  }>
                  {assignment.score ?? 'Not graded'}
                </Text>
              </View>
            </PressableHighlight>
          ))}
        </SquircleView>
      </View>
        </>
      )}
    </ScrollView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    paddingBottom: 48,
  },
  header: {
    marginTop: 24,
    paddingHorizontal: 20,
    gap: 4,
  },
  course: {
    fontFamily: Fonts.sans,
    fontWeight: '600',
    fontSize: 22,
    color: theme.textPrimary,
  },
  courseDetail: {
    fontFamily: Fonts.sans,
    fontWeight: '500',
    fontSize: 14,
    color: theme.textSecondary,
  },
  segmentWrap: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingVertical: 18,
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    fontFamily: Fonts.rounded,
    fontWeight: '500',
    fontSize: 28,
    color: theme.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: {
    fontFamily: Fonts.sans,
    fontWeight: '500',
    fontSize: 13,
    color: theme.textSecondary,
  },
  recordRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  section: {
    marginTop: 28,
    paddingHorizontal: 20,
    gap: 16,
  },
  sectionLabel: {
    fontFamily: Fonts.sans,
    fontWeight: '500',
    fontSize: 14,
    color: theme.sectionLabel,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabelDetail: {
    fontFamily: Fonts.sans,
    fontWeight: '500',
    fontSize: 14,
    color: theme.textMuted,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  reportInfo: {
    gap: 4,
  },
  reportGrade: {
    fontFamily: Fonts.rounded,
    fontWeight: '500',
    fontSize: 44,
    letterSpacing: -1.76,
    color: theme.textPrimary,
  },
  reportLetter: {
    fontFamily: Fonts.rounded,
    fontWeight: '500',
    fontSize: 56,
    color: theme.gradeDim,
    paddingRight: 6,
  },
  reportCaption: {
    fontFamily: Fonts.rounded,
    fontWeight: '500',
    fontSize: 14,
    color: theme.textSecondary,
  },
  card: {
    alignSelf: 'stretch',
  },
  categoryRow: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  categoryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryWeight: {
    fontFamily: Fonts.sans,
    fontWeight: '500',
    fontSize: 13,
    color: theme.textSecondary,
  },
  categoryLetter: {
    fontSize: 13,
    color: theme.sectionLabel,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.track,
    overflow: 'hidden',
  },
  trackFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.trackFill,
  },
  rowBorder: {
    borderBottomWidth: 2,
    borderBottomColor: theme.separator,
  },
  assignmentRow: {
    height: 63,
  },
  assignmentContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  assignmentInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assignmentInfo: {
    flexShrink: 1,
    paddingRight: 16,
    gap: 5,
  },
  rowTitle: {
    fontFamily: Fonts.sans,
    fontWeight: '500',
    fontSize: 14,
    color: theme.textPrimary,
  },
  rowSub: {
    fontFamily: Fonts.sans,
    fontWeight: '500',
    fontSize: 14,
    color: theme.textSecondary,
  },
  rowScore: {
    fontFamily: Fonts.rounded,
    fontWeight: '500',
    fontSize: 14,
    color: theme.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  rowScoreEmpty: {
    fontFamily: Fonts.rounded,
    fontWeight: '500',
    fontSize: 14,
    color: theme.textSecondary,
  },
});
}
