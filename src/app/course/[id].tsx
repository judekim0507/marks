import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PressableHighlight } from '@/components/pressable-highlight';
import { SegmentedControl } from '@/components/segmented-control';
import { SquircleView } from '@/components/squircle-view';
import { useAppTheme } from '@/components/theme-context';
import { Fonts, type AppTheme } from '@/constants/theme';
import { useSchool } from '@/providers/context';

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
  const school = useSchool();
  const { id } = useLocalSearchParams<{ id: string }>();
  const course = school.courses.find((c) => c.id === id) ?? school.courses[0];
  const detail = school.courseDetail(course.id);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.course}>{course.name}</Text>
        <Text style={styles.courseDetail}>
          {course.teacher} · Block {course.block} · {school.roomLabel(course.room)}
        </Text>
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
                {detail.attendance.summary.map((stat) => (
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
              {detail.attendance.records.map((record, index) => (
                <View
                  key={record.id}
                  style={[
                    styles.assignmentRow,
                    styles.recordRow,
                    index < detail.attendance.records.length - 1 && styles.rowBorder,
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
          <Text style={styles.sectionLabelDetail}>{school.term.label}</Text>
        </View>
        <SquircleView
          style={styles.card}
          backgroundColor={theme.card}
          cornerRadius={24}
          cornerSmoothing={0.75}>
          <View style={styles.reportCard}>
            <View style={styles.reportInfo}>
              <Text style={styles.reportGrade}>{course.grade.toFixed(1)}%</Text>
              <Text style={styles.reportCaption}>{detail.updated}</Text>
            </View>
            <Text style={styles.reportLetter}>{school.letterFor(course.grade)}</Text>
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
          {detail.categories.map((category, index) => (
            <View
              key={category.id}
              style={[
                styles.categoryRow,
                index < detail.categories.length - 1 && styles.rowBorder,
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
          {detail.assignments.map((assignment, index) => (
            <PressableHighlight
              key={assignment.id}
              style={[
                styles.assignmentRow,
                index < detail.assignments.length - 1 && styles.rowBorder,
              ]}
              contentStyle={styles.assignmentContent}
              cornerSmoothing={0.75}
              cornerRadii={cardCorners(index, detail.assignments.length)}>
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
