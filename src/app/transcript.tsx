import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PressableHighlight } from '@/components/pressable-highlight';
import { SquircleView } from '@/components/squircle-view';
import { useAppTheme } from '@/components/theme-context';
import { Fonts, type AppTheme } from '@/constants/theme';
import { useSchool } from '@/providers/context';

function cardCorners(index: number, count: number) {
  if (index === 0) return { topLeft: 24, topRight: 24 };
  if (index === count - 1) return { bottomLeft: 24, bottomRight: 24 };
  return undefined;
}

export default function TranscriptScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const school = useSchool();
  const average = school.termAverage();
  const highest = Math.max(...school.courses.map((course) => course.grade));
  const summary = [
    { id: 'average', label: 'Average', value: `${Math.round(average)}%` },
    { id: 'classes', label: 'Classes', value: String(school.courses.length) },
    { id: 'highest', label: 'Highest', value: `${highest}%` },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Transcript</Text>
        <Text style={styles.subtitle}>{school.profile.detail}</Text>
      </View>

      <View style={styles.section}>
        <SquircleView
          style={styles.card}
          backgroundColor={theme.card}
          cornerRadius={24}
          cornerSmoothing={0.75}>
          <View style={styles.summaryRow}>
            {summary.map((stat) => (
              <View key={stat.id} style={styles.summaryStat}>
                <Text style={styles.summaryValue}>{stat.value}</Text>
                <Text style={styles.summaryLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </SquircleView>
      </View>

      {school.transcript.terms.map((term) => (
        <View key={term.id} style={styles.section}>
          <Text style={styles.sectionLabel}>{term.label}</Text>
          <SquircleView
            style={styles.card}
            backgroundColor={theme.card}
            cornerRadius={24}
            cornerSmoothing={0.75}>
            {term.courses.map((course, index) => (
              <PressableHighlight
                key={course.id}
                style={[
                  styles.row,
                  index < term.courses.length - 1 && styles.rowBorder,
                ]}
                contentStyle={styles.rowContent}
                cornerSmoothing={0.75}
                cornerRadii={cardCorners(index, term.courses.length)}>
                <View style={styles.rowInner}>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {course.name}
                    </Text>
                    <Text style={styles.rowSub}>{course.detail}</Text>
                  </View>
                  <Text style={styles.rowGrade}>
                    {course.grade}%{' '}
                    <Text style={styles.rowLetter}>
                      {school.letterFor(course.grade)}
                    </Text>
                  </Text>
                </View>
              </PressableHighlight>
            ))}
          </SquircleView>
        </View>
      ))}
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
    title: {
      fontFamily: Fonts.sans,
      fontWeight: '600',
      fontSize: 22,
      color: theme.textPrimary,
    },
    subtitle: {
      fontFamily: Fonts.sans,
      fontWeight: '500',
      fontSize: 14,
      color: theme.textSecondary,
    },
    section: {
      marginTop: 24,
      paddingHorizontal: 20,
      gap: 16,
    },
    sectionLabel: {
      fontFamily: Fonts.sans,
      fontWeight: '500',
      fontSize: 14,
      color: theme.sectionLabel,
    },
    card: {
      alignSelf: 'stretch',
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
    row: {
      height: 63,
    },
    rowBorder: {
      borderBottomWidth: 2,
      borderBottomColor: theme.separator,
    },
    rowContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
    },
    rowInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rowInfo: {
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
    rowGrade: {
      fontFamily: Fonts.rounded,
      fontWeight: '500',
      fontSize: 14,
      color: theme.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    rowLetter: {
      fontSize: 12,
      color: theme.sectionLabel,
    },
  });
}
