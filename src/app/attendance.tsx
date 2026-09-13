import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PressableHighlight } from '@/components/pressable-highlight';
import { SquircleView } from '@/components/squircle-view';
import { useAppTheme } from '@/components/theme-context';
import { Fonts, type AppTheme } from '@/constants/theme';
import { useSchool } from '@/providers/context';
import { useSessionProvider } from '@/providers/auth-context';

function cardCorners(index: number, count: number) {
  if (index === 0) return { topLeft: 24, topRight: 24 };
  if (index === count - 1) return { bottomLeft: 24, bottomRight: 24 };
  return undefined;
}

export default function AttendanceScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const sessionSchool = useSessionProvider();
  const fallback = useSchool();
  const school = sessionSchool ?? fallback;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Attendance</Text>
        <Text style={styles.subtitle}>{school.term.label}</Text>
      </View>

      <View style={styles.section}>
        <SquircleView
          style={styles.card}
          backgroundColor={theme.card}
          cornerRadius={24}
          cornerSmoothing={0.75}>
          <View style={styles.summaryRow}>
            {school.attendance.summary.map((stat) => (
              <View key={stat.id} style={styles.summaryStat}>
                <Text style={styles.summaryValue}>{stat.value}</Text>
                <Text style={styles.summaryLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </SquircleView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>By Class</Text>
        <SquircleView
          style={styles.card}
          backgroundColor={theme.card}
          cornerRadius={24}
          cornerSmoothing={0.75}>
          {school.attendance.byClass.map((item, index) => (
            <PressableHighlight
              key={item.id}
              style={[
                styles.row,
                index < school.attendance.byClass.length - 1 && styles.rowBorder,
              ]}
              contentStyle={styles.rowContent}
              cornerSmoothing={0.75}
              cornerRadii={cardCorners(index, school.attendance.byClass.length)}>
              <View style={styles.rowInner}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.course}
                  </Text>
                  <Text style={styles.rowSub}>{item.instructor}</Text>
                </View>
                <Text style={styles.rowRecord}>{item.record}</Text>
              </View>
            </PressableHighlight>
          ))}
        </SquircleView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Recent</Text>
        {school.attendance.recent.length === 0 ? (
          <Text style={styles.emptyText}>No attendance records from MyEd yet.</Text>
        ) : (
        <SquircleView
          style={styles.card}
          backgroundColor={theme.card}
          cornerRadius={24}
          cornerSmoothing={0.75}>
          {school.attendance.recent.map((record, index) => (
            <View
              key={record.id}
              style={[
                styles.row,
                styles.staticRow,
                index < school.attendance.recent.length - 1 && styles.rowBorder,
              ]}>
              <View style={styles.rowInner}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{record.date}</Text>
                  <Text style={styles.rowSub}>{record.detail}</Text>
                </View>
                <Text style={styles.rowRecord}>{record.status}</Text>
              </View>
            </View>
          ))}
        </SquircleView>
        )}
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
    staticRow: {
      paddingHorizontal: 20,
      paddingTop: 12,
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
    rowRecord: {
      fontFamily: Fonts.rounded,
      fontWeight: '500',
      fontSize: 14,
      color: theme.textSecondary,
    },
    emptyText: {
      fontFamily: Fonts.sans,
      fontWeight: '500',
      fontSize: 14,
      color: theme.textSecondary,
      paddingHorizontal: 20,
    },
  });
}
