import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChevronRightIcon } from '@/components/icons';
import { PressableHighlight } from '@/components/pressable-highlight';
import { SquircleView } from '@/components/squircle-view';
import { useAppTheme } from '@/components/theme-context';
import { Fonts, type AppTheme } from '@/constants/theme';
import { useSchool } from '@/providers/context';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
// Mock "today" and event days, pinned to August 2026.
const TODAY = { year: 2026, month: 7, day: 10 };
const EVENT_DAYS = new Set([12, 14, 18, 21]);

type Cell = { key: string; day: number; inMonth: boolean };

function buildWeeks(year: number, month: number): Cell[][] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const cells: Cell[] = [];
  for (let i = firstWeekday - 1; i >= 0; i--) {
    cells.push({ key: `prev-${daysInPrev - i}`, day: daysInPrev - i, inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ key: `day-${day}`, day, inMonth: true });
  }
  let next = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ key: `next-${next}`, day: next, inMonth: false });
    next++;
  }
  return Array.from({ length: cells.length / 7 }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  );
}

function cardCorners(index: number, count: number) {
  if (index === 0) return { topLeft: 24, topRight: 24 };
  if (index === count - 1) return { bottomLeft: 24, bottomRight: 24 };
  return undefined;
}

export default function CalendarScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const school = useSchool();
  const upcoming = school.upcoming;
  const [visible, setVisible] = useState({ year: TODAY.year, month: TODAY.month });
  const weeks = useMemo(
    () => buildWeeks(visible.year, visible.month),
    [visible],
  );
  const isTodayMonth =
    visible.year === TODAY.year && visible.month === TODAY.month;

  const shiftMonth = (delta: number) => {
    setVisible(({ year, month }) => {
      const next = month + delta;
      if (next < 0) return { year: year - 1, month: 11 };
      if (next > 11) return { year: year + 1, month: 0 };
      return { year, month: next };
    });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
        <Text style={styles.subtitle}>
          {upcoming.length} upcoming this month
        </Text>
      </View>

      <View style={styles.section}>
        <SquircleView
          style={styles.calendarCard}
          backgroundColor={theme.card}
          cornerRadius={24}
          cornerSmoothing={0.75}>
          <View style={styles.monthRow}>
            <Pressable
              hitSlop={14}
              style={styles.monthArrow}
              onPress={() => shiftMonth(-1)}>
              <View style={styles.arrowFlip}>
                <ChevronRightIcon
                  color={theme.textSecondary}
                  width={6.6}
                  height={12}
                />
              </View>
            </Pressable>
            <Text style={styles.monthLabel}>
              {MONTH_NAMES[visible.month]} {visible.year}
            </Text>
            <Pressable
              hitSlop={14}
              style={styles.monthArrow}
              onPress={() => shiftMonth(1)}>
              <ChevronRightIcon
                color={theme.textSecondary}
                width={6.6}
                height={12}
              />
            </Pressable>
          </View>
          <SquircleView
            style={styles.inset}
            backgroundColor={
              theme.dark ? 'rgba(255, 255, 255, 0.08)' : theme.background
            }
            cornerRadius={18}
            cornerSmoothing={0.75}>
            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((weekday, index) => (
                <Text key={index} style={styles.weekday}>
                  {weekday}
                </Text>
              ))}
            </View>
            {weeks.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.weekRow}>
                {week.map((cell) => {
                  const isToday =
                    isTodayMonth && cell.inMonth && cell.day === TODAY.day;
                  return (
                    <View key={cell.key} style={styles.dayCell}>
                      <View
                        style={[styles.dayFace, isToday && styles.todayFace]}>
                        <Text
                          style={[
                            styles.dayText,
                            !cell.inMonth && styles.dayTextOutside,
                            isToday && styles.dayTextToday,
                          ]}>
                          {cell.day}
                        </Text>
                      </View>
                      {isTodayMonth &&
                        cell.inMonth &&
                        EVENT_DAYS.has(cell.day) && (
                          <View style={styles.eventDot} />
                        )}
                    </View>
                  );
                })}
              </View>
            ))}
          </SquircleView>
        </SquircleView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Upcoming</Text>
        <SquircleView
          style={styles.card}
          backgroundColor={theme.card}
          cornerRadius={24}
          cornerSmoothing={0.75}>
          {upcoming.map((item, index) => (
            <PressableHighlight
              key={item.id}
              style={[
                styles.row,
                index < upcoming.length - 1 && styles.rowBorder,
              ]}
              contentStyle={styles.rowContent}
              cornerSmoothing={0.75}
              cornerRadii={cardCorners(index, upcoming.length)}>
              <View style={styles.rowInner}>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.rowSub}>{item.course}</Text>
                </View>
                <Text style={styles.rowDate}>{item.date}</Text>
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
    calendarCard: {
      alignSelf: 'stretch',
      paddingHorizontal: 8,
      paddingBottom: 8,
    },
    monthRow: {
      height: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
    },
    monthLabel: {
      fontFamily: Fonts.rounded,
      fontWeight: '600',
      fontSize: 14,
      color: theme.textPrimary,
      textAlign: 'center',
    },
    monthArrow: {
      width: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    arrowFlip: {
      transform: [{ scaleX: -1 }],
    },
    inset: {
      alignSelf: 'stretch',
      paddingVertical: 10,
      paddingHorizontal: 6,
    },
    weekdayRow: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    weekday: {
      flex: 1,
      textAlign: 'center',
      fontFamily: Fonts.rounded,
      fontWeight: '600',
      fontSize: 11,
      color: theme.textMuted,
    },
    weekRow: {
      flexDirection: 'row',
    },
    dayCell: {
      flex: 1,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayFace: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    todayFace: {
      backgroundColor: theme.trackFill,
    },
    dayText: {
      fontFamily: Fonts.rounded,
      fontWeight: '500',
      fontSize: 14,
      color: theme.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    dayTextOutside: {
      color: theme.textMuted,
    },
    dayTextToday: {
      color: theme.card,
      fontWeight: '600',
    },
    eventDot: {
      position: 'absolute',
      bottom: 0,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.textSecondary,
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
    rowDate: {
      fontFamily: Fonts.rounded,
      fontWeight: '500',
      fontSize: 14,
      color: theme.textSecondary,
      fontVariant: ['tabular-nums'],
    },
  });
}
