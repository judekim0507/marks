import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SquircleView } from '@/components/squircle-view';
import { useAppTheme } from '@/components/theme-context';
import { Fonts, type AppTheme } from '@/constants/theme';
import { useSchool } from '@/providers/context';
import { useAuth, useSessionProvider } from '@/providers/auth-context';

export default function ScheduleScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const sessionSchool = useSessionProvider();
  const fallback = useSchool();
  const school = sessionSchool ?? fallback;
  const entries = school.schedule.entries;
  const { session, refreshSnapshot, refreshing, progress } = useAuth();
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const canRefresh = !!session && session.kind === 'live' && !refreshing;

  const onRefresh = async () => {
    if (!canRefresh) return;
    setRefreshError(null);
    try {
      await refreshSnapshot();
    } catch (e) {
      setRefreshError(e instanceof Error ? e.message : 'Refresh failed.');
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Schedule</Text>
          <Text style={styles.subtitle}>
            {entries.length > 0
              ? `${entries.length} classes · ${school.term.label}`
              : school.term.label}
          </Text>
        </View>
        {canRefresh || refreshing ? (
          <Pressable
            onPress={onRefresh}
            disabled={!canRefresh}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Refresh schedule from MyEd">
            {refreshing ? (
              <ActivityIndicator color={theme.textSecondary} />
            ) : (
              <Text style={styles.refresh}>Refresh</Text>
            )}
          </Pressable>
        ) : null}
      </View>
      {refreshing && progress ? (
        <Text style={styles.progress}>{progress}</Text>
      ) : null}
      {refreshError ? (
        <Text style={styles.refreshError}>{refreshError}</Text>
      ) : null}

      {entries.length === 0 ? (
        <View style={styles.section}>
          <Text style={styles.emptyText}>No schedule from MyEd yet.</Text>
        </View>
      ) : (
        <View style={styles.section}>
          <SquircleView
            style={styles.card}
            backgroundColor={theme.card}
            cornerRadius={24}
            cornerSmoothing={0.75}>
            {entries.map((entry, index) => (
              <View
                key={entry.id}
                style={[
                  styles.row,
                  index < entries.length - 1 && styles.rowBorder,
                ]}>
                <View style={styles.blockBadge}>
                  <Text style={styles.blockText}>{entry.block || '–'}</Text>
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {entry.course}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {entry.teacher}
                    {entry.teacher && entry.room ? ' · ' : ''}
                    {entry.room ? school.roomLabel(entry.room) : ''}
                  </Text>
                  {entry.days || entry.term ? (
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {[entry.term, entry.days].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </SquircleView>
        </View>
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
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    headerText: {
      gap: 4,
      flexShrink: 1,
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
    card: {
      alignSelf: 'stretch',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      minHeight: 72,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    rowBorder: {
      borderBottomWidth: 2,
      borderBottomColor: theme.separator,
    },
    blockBadge: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: theme.trackFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    blockText: {
      fontFamily: Fonts.rounded,
      fontWeight: '600',
      fontSize: 17,
      color: theme.card,
    },
    rowInfo: {
      flex: 1,
      gap: 3,
    },
    rowTitle: {
      fontFamily: Fonts.sans,
      fontWeight: '600',
      fontSize: 15,
      color: theme.textPrimary,
    },
    rowSub: {
      fontFamily: Fonts.sans,
      fontWeight: '500',
      fontSize: 13,
      color: theme.textSecondary,
    },
    rowMeta: {
      fontFamily: Fonts.sans,
      fontWeight: '500',
      fontSize: 12,
      color: theme.textMuted,
    },
    emptyText: {
      fontFamily: Fonts.sans,
      fontWeight: '500',
      fontSize: 14,
      color: theme.textSecondary,
      paddingHorizontal: 20,
    },
    refresh: {
      fontFamily: Fonts.sans,
      fontWeight: '600',
      fontSize: 14,
      color: theme.trackFill,
      paddingTop: 4,
    },
    progress: {
      fontFamily: Fonts.sans,
      fontWeight: '500',
      fontSize: 13,
      color: theme.textSecondary,
      paddingHorizontal: 20,
      marginTop: 8,
    },
    refreshError: {
      fontFamily: Fonts.sans,
      fontWeight: '500',
      fontSize: 13,
      color: '#f87171',
      paddingHorizontal: 20,
      marginTop: 8,
    },
  });
}
