import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  ScheduleIcon,
  ChevronRightIcon,
  ClockIcon,
  DocIcon,
  PersonIcon,
} from '@/components/icons';
import { useSchool } from '@/providers/context';
import { useAuth, useSessionProvider } from '@/providers/auth-context';
import { PressableHighlight } from '@/components/pressable-highlight';
import { SquircleView } from '@/components/squircle-view';
import { useAppTheme } from '@/components/theme-context';
import { Fonts, type AppTheme } from '@/constants/theme';


const QUICK_ACTIONS: {
  id: string;
  label: string;
  Icon: (props: { color: string }) => React.JSX.Element;
  corners?: { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number };
}[] = [
  {
    id: 'transcript',
    label: 'Transcript',
    Icon: DocIcon,
    corners: { topLeft: 60, topRight: 10, bottomRight: 10, bottomLeft: 60 },
  },
  {
    id: 'schedule',
    label: 'Schedule',
    Icon: ScheduleIcon,
    corners: undefined,
  },
  {
    id: 'attendance',
    label: 'Attendance',
    Icon: ClockIcon,
    corners: undefined,
  },
  {
    id: 'profile',
    label: 'Settings',
    Icon: PersonIcon,
    corners: { topLeft: 10, topRight: 60, bottomRight: 60, bottomLeft: 10 },
  },
];

/** Minimum ms between navigations. Kills double-pushed sheets from fast taps. */
const NAV_DEBOUNCE_MS = 800;

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { status } = useAuth();
  const sessionSchool = useSessionProvider();
  const fallback = useSchool();
  const school = sessionSchool ?? fallback;
  const isNavigating = useRef(false);
  const lastNav = useRef(0);

  const navigate = useCallback(
    (path: '/transcript' | '/schedule' | '/attendance' | '/settings' | { pathname: '/course/[id]'; params: { id: string } }) => {
      const now = Date.now();
      if (isNavigating.current) return;
      if (now - lastNav.current < NAV_DEBOUNCE_MS) return;
      isNavigating.current = true;
      lastNav.current = now;
      router.push(path as never);
      setTimeout(() => {
        isNavigating.current = false;
      }, NAV_DEBOUNCE_MS);
    },
    [router],
  );

  useEffect(() => {
    if (status === 'signed-out') router.replace('/signin');
  }, [status, router]);

  if (status === 'restoring' || status === 'signed-out') {
    // Avoid flashing the home snapshot before the session restore lands.
    return null;
  }

  const average = school.termAverage();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />

      <View style={styles.header}>
        <Text style={styles.headerLabel}>
          Your {school.term.label.toLowerCase()} average
        </Text>
        <Text style={styles.average}>
          {`${Math.round(average)}% `}
          <Text style={styles.averageGrade}>{school.letterFor(average)}</Text>
        </Text>
      </View>

      <View style={styles.quickActions}>
        {QUICK_ACTIONS.map((action) => (
          <PressableHighlight
            key={action.id}
            style={styles.quickAction}
            contentStyle={styles.quickActionContent}
            cornerRadius={10}
            cornerRadii={action.corners}
            cornerSmoothing={1}
            pressedScale={0.96}
            accessibilityLabel={action.label}
            accessibilityRole="button"
            onPress={() => {
              if (action.id === 'transcript') navigate('/transcript');
              else if (action.id === 'schedule') navigate('/schedule');
              else if (action.id === 'attendance') navigate('/attendance');
              else if (action.id === 'profile') navigate('/settings');
            }}>
            <SquircleView
              style={styles.quickActionInner}
              backgroundColor={theme.card}
              cornerRadius={10}
              cornerRadii={action.corners}
              cornerSmoothing={1}>
              <action.Icon color={theme.icon} />
            </SquircleView>
          </PressableHighlight>
        ))}
      </View>

      <View style={styles.classes}>
        <Text style={styles.classesLabel}>Your Classes</Text>
        <SquircleView
          style={styles.classCard}
          backgroundColor={theme.card}
          cornerRadius={24}
          cornerSmoothing={0.75}>
          {school.courses.map((course, index) => (
            <PressableHighlight
              key={course.id}
              onPress={() =>
                navigate({
                  pathname: '/course/[id]',
                  params: { id: course.id },
                })
              }
              style={[
                styles.classRow,
                index < school.courses.length - 1 && styles.classRowBorder,
              ]}
              contentStyle={styles.classRowContent}
              cornerSmoothing={0.75}
              cornerRadii={
                index === 0
                  ? { topLeft: 24, topRight: 24 }
                  : index === school.courses.length - 1
                    ? { bottomLeft: 24, bottomRight: 24 }
                    : undefined
              }>
              <View style={styles.classRowInner}>
                <View style={styles.classInfo}>
                  <Text style={styles.className} numberOfLines={1}>
                    {course.name}
                  </Text>
                  <Text style={styles.classInstructor}>
                    {course.teacher} · Block {course.block}
                  </Text>
                </View>
                <View style={styles.classGradeGroup}>
                  <Text style={styles.classGrade}>
                    {course.grade.toFixed(1)} {school.letterFor(course.grade)}
                  </Text>
                  <View style={styles.chevronBox}>
                    <View style={styles.chevron}>
                      <ChevronRightIcon
                        color={theme.textSecondary}
                        width={6.5856}
                        height={12}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </PressableHighlight>
          ))}
        </SquircleView>
      </View>
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
      minHeight: 887,
    },
    header: {
      position: 'absolute',
      top: 95,
      left: 0,
      right: 0,
      alignItems: 'center',
      gap: 8,
    },
    headerLabel: {
      fontFamily: Fonts.rounded,
      fontWeight: '500',
      fontSize: 18,
      color: theme.sectionLabel,
      textAlign: 'center',
    },
    average: {
      fontFamily: Fonts.rounded,
      fontWeight: '500',
      fontSize: 64,
      letterSpacing: -2.56,
      color: theme.textPrimary,
      textAlign: 'center',
    },
    averageGrade: {
      fontSize: 48,
      color: theme.gradeDim,
    },
    quickActions: {
      position: 'absolute',
      top: 220,
      left: 20,
      right: 20,
      flexDirection: 'row',
      gap: 4,
    },
    quickAction: {
      flex: 1,
      height: 42,
    },
    quickActionContent: {
      flex: 1,
    },
    quickActionInner: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    classes: {
      position: 'absolute',
      top: 290,
      left: 20,
      right: 20,
      gap: 10,
    },
    classesLabel: {
      fontFamily: Fonts.sans,
      fontWeight: '500',
      fontSize: 14,
      color: theme.sectionLabel,
      marginTop: 4,
      paddingLeft: 8,
    },
    classCard: {
      alignSelf: 'stretch',
    },
    classRow: {
      height: 63,
    },
    classRowBorder: {
      borderBottomWidth: 2,
      borderBottomColor: theme.separator,
    },
    classRowContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
    },
    classRowInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    classInfo: {
      flexShrink: 1,
      paddingRight: 12,
      gap: 5,
    },
    className: {
      fontFamily: Fonts.sans,
      fontWeight: '500',
      fontSize: 14,
      color: theme.textPrimary,
    },
    classInstructor: {
      fontFamily: Fonts.sans,
      fontWeight: '500',
      fontSize: 14,
      color: theme.textSecondary,
    },
    classGradeGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    classGrade: {
      fontFamily: Fonts.rounded,
      fontWeight: '500',
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'right',
    },
    chevronBox: {
      width: 5,
      height: 10,
    },
    chevron: {
      position: 'absolute',
      top: -1,
      left: -1,
      width: 6.5856,
      height: 12,
    },
  });
}
