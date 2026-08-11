import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  CheckCircleIcon,
  ChevronRightIcon,
  HeartIcon,
  PersonCircleIcon,
  TrayIcon,
} from '@/components/icons';
import { PressableHighlight } from '@/components/pressable-highlight';
import { PressableScale } from '@/components/pressable-scale';
import { SquircleView } from '@/components/squircle-view';
import { useAppTheme } from '@/components/theme-context';
import { Fonts, type AppTheme } from '@/constants/theme';

const CLASSES = Array.from({ length: 8 }, (_, index) => ({
  id: `class-${index}`,
  course: 'COURSE_NAME',
  instructor: 'INSTRUCTOR_NAME',
  grade: '00.0 A',
}));

const QUICK_ACTIONS = [
  {
    id: 'tasks',
    Icon: CheckCircleIcon,
    iconSize: { width: 22, height: 22 },
    corners: { topLeft: 60, topRight: 10, bottomRight: 10, bottomLeft: 60 },
  },
  {
    id: 'favorites',
    Icon: HeartIcon,
    iconSize: { width: 22, height: 20 },
    corners: undefined,
  },
  {
    id: 'archive',
    Icon: TrayIcon,
    iconSize: { width: 26, height: 19 },
    corners: undefined,
  },
  {
    id: 'profile',
    Icon: PersonCircleIcon,
    iconSize: { width: 22, height: 22 },
    corners: { topLeft: 10, topRight: 60, bottomRight: 60, bottomLeft: 10 },
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />

      <View style={styles.header}>
        <Text style={styles.headerLabel}>Your term 1 average</Text>
        <Text style={styles.average}>
          {'88% '}
          <Text style={styles.averageGrade}>A</Text>
        </Text>
      </View>

      <View style={styles.quickActions}>
        {QUICK_ACTIONS.map((action) => (
          <PressableScale
            key={action.id}
            style={styles.quickAction}
            onPress={
              action.id === 'profile'
                ? () => router.push('/settings')
                : undefined
            }>
            <SquircleView
              style={styles.quickActionInner}
              backgroundColor={theme.card}
              cornerRadius={10}
              cornerRadii={action.corners}
              cornerSmoothing={1}>
              <action.Icon color={theme.icon} {...action.iconSize} />
            </SquircleView>
          </PressableScale>
        ))}
      </View>

      <View style={styles.classes}>
        <Text style={styles.classesLabel}>Your Classes</Text>
        <SquircleView
          style={styles.classCard}
          backgroundColor={theme.card}
          cornerRadius={24}
          cornerSmoothing={0.75}>
          {CLASSES.map((item, index) => (
            <PressableHighlight
              key={item.id}
              onPress={() =>
                router.push({
                  pathname: '/course/[id]',
                  params: {
                    id: item.id,
                    course: item.course,
                    instructor: item.instructor,
                    grade: item.grade,
                  },
                })
              }
              style={[
                styles.classRow,
                index < CLASSES.length - 1 && styles.classRowBorder,
              ]}
              contentStyle={styles.classRowContent}
              cornerSmoothing={0.75}
              cornerRadii={
                index === 0
                  ? { topLeft: 24, topRight: 24 }
                  : index === CLASSES.length - 1
                    ? { bottomLeft: 24, bottomRight: 24 }
                    : undefined
              }>
              <View style={styles.classRowInner}>
                <View style={styles.classInfo}>
                  <Text style={styles.className}>{item.course}</Text>
                  <Text style={styles.classInstructor}>{item.instructor}</Text>
                </View>
                <View style={styles.classGradeGroup}>
                  <Text style={styles.classGrade}>{item.grade}</Text>
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
