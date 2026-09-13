import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { SegmentedControl } from '@/components/segmented-control';
import { SquircleView } from '@/components/squircle-view';
import { useAppTheme } from '@/components/theme-context';
import { Fonts, type AppTheme } from '@/constants/theme';
import { useSchool } from '@/providers/context';
import { useAuth, useSessionProvider } from '@/providers/auth-context';
import { useLiveCourseDetail } from '@/providers/myed/live-store';

type CourseTab = 'overview' | 'attendance';

const barEasing = Easing.bezier(0.2, 0, 0, 1);

/**
 * Progress bar that grows to `score`% via a shared value on mount,
 * instead of rendering static width in a single frame.
 */
function CategoryBar({
  score,
  color,
  style,
}: {
  score: number;
  color: string;
  style: { height: number; borderRadius: number };
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(score, { duration: 420, easing: barEasing });
  }, [progress, score]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[{ height: style.height, borderRadius: style.borderRadius, backgroundColor: color }, fillStyle]}
    />
  );
}

export default function CourseScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [tab, setTab] = useState<CourseTab>('overview');
  const sessionSchool = useSessionProvider();
  const fallback = useSchool();
  const school = sessionSchool ?? fallback;
  const { session } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const course = school.courses.find((c) => c.id === id) ?? school.courses[0];
  // Live sessions restored from storage may lack this class's detail —
  // refetch it on demand and prefer it once loaded.
  const liveDetail = useLiveCourseDetail(session, course.id);
  const detail = liveDetail.detail ?? school.courseDetail(course.id);
  const loadingDetail = liveDetail.loading;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.course}>{course.name}</Text>
        <Text style={styles.courseDetail}>
          {course.teacher} · Block {course.block} · {school.roomLabel(course.room)}
        </Text>
      </View>
      {loadingDetail && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={theme.textSecondary} />
          <Text style={styles.loadingText}>Loading live grades…</Text>
        </View>
      )}

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
        <Animated.View
          key="attendance"
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(150)}>
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
        </Animated.View>
      )}

      {tab === 'overview' && (
        <Animated.View
          key="overview"
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(150)}>
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
                <CategoryBar score={category.score} color={theme.trackFill} style={styles.trackFill} />
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
            <View
              key={assignment.id}
              style={[
                styles.assignmentRow,
                styles.assignmentStatic,
                index < detail.assignments.length - 1 && styles.rowBorder,
              ]}>
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
            </View>
          ))}
</SquircleView>
          </View>
        </Animated.View>
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
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 20,
  },
  loadingText: {
    fontFamily: Fonts.sans,
    fontWeight: '500',
    fontSize: 13,
    color: theme.textSecondary,
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
  assignmentStatic: {
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
