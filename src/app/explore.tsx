import { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { ChevronRightIcon } from '@/components/icons';
import { PressableHighlight } from '@/components/pressable-highlight';
import { SquircleView } from '@/components/squircle-view';
import { useAppTheme } from '@/components/theme-context';
import { Fonts, type AppTheme } from '@/constants/theme';
import { useSchool } from '@/providers/context';
import { useAuth, useSessionProvider } from '@/providers/auth-context';

export default function ExploreScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const sessionSchool = useSessionProvider();
  const fallback = useSchool();
  const school = sessionSchool ?? fallback;
  const { status } = useAuth();
  const [query, setQuery] = useState('');

  const trimmed = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!trimmed) return school.courses;
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    return school.courses.filter((course) => {
      const hay = `${course.name} ${course.teacher} ${course.room} ${course.block}`.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
  }, [school.courses, trimmed]);

  if (status === 'restoring') {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Explore</Text>
          <Text style={styles.subtitle}>Loading…</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <Text style={styles.subtitle}>
          Find your classes by name, teacher, or room
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <SquircleView
          style={styles.searchBox}
          backgroundColor={theme.card}
          cornerRadius={14}
          cornerSmoothing={0.75}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search courses, teachers, rooms…"
            placeholderTextColor={theme.textMuted}
            style={[styles.input, { color: theme.textPrimary }]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </SquircleView>
        {trimmed.length > 0 && (
          <Text style={styles.meta}>
            {filtered.length} result{filtered.length === 1 ? '' : 's'} for “{query.trim()}”
          </Text>
        )}
      </View>

      <View style={styles.section}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {trimmed ? 'No matches' : 'Start typing to search'}
            </Text>
            <Text style={styles.emptySub}>
              {trimmed
                ? `Nothing matched “${query.trim()}”. Try a different name or block.`
                : 'Search by course, teacher, block, or room number.'}
            </Text>
          </View>
        ) : (
          <SquircleView
            style={styles.card}
            backgroundColor={theme.card}
            cornerRadius={24}
            cornerSmoothing={0.75}>
            {filtered.map((course, index) => (
              <PressableHighlight
                key={course.id}
                onPress={() =>
                  router.push({
                    pathname: '/course/[id]',
                    params: { id: course.id },
                  })
                }
                style={[
                  styles.row,
                  index < filtered.length - 1 && styles.rowBorder,
                ]}
                contentStyle={styles.rowContent}
                cornerSmoothing={0.75}
                cornerRadii={
                  index === 0
                    ? { topLeft: 24, topRight: 24 }
                    : index === filtered.length - 1
                      ? { bottomLeft: 24, bottomRight: 24 }
                      : undefined
                }>
                <View style={styles.rowInner}>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {course.name}
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {course.teacher} · Block {course.block} · {school.roomLabel(course.room)}
                    </Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={styles.rowGrade}>
                      {course.grade.toFixed(1)} {school.letterFor(course.grade)}
                    </Text>
                    <ChevronRightIcon
                      color={theme.textMuted}
                      width={5.5}
                      height={10}
                    />
                  </View>
                </View>
              </PressableHighlight>
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
    },
    content: {
      paddingBottom: 48,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 28,
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
    searchWrap: {
      paddingHorizontal: 20,
      paddingTop: 16,
      gap: 8,
    },
    searchBox: {
      paddingHorizontal: 14,
      height: 44,
      justifyContent: 'center',
    },
    input: {
      fontFamily: Fonts.sans,
      fontWeight: '500',
      fontSize: 15,
    },
    meta: {
      fontFamily: Fonts.sans,
      fontWeight: '500',
      fontSize: 12,
      color: theme.textMuted,
      paddingHorizontal: 2,
    },
    section: {
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    card: {
      alignSelf: 'stretch',
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
      paddingRight: 12,
      gap: 4,
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
      fontSize: 12,
      color: theme.textSecondary,
    },
    rowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    rowGrade: {
      fontFamily: Fonts.rounded,
      fontWeight: '600',
      fontSize: 13,
      color: theme.textPrimary,
    },
    empty: {
      paddingVertical: 32,
      paddingHorizontal: 20,
      alignItems: 'center',
      gap: 6,
    },
    emptyTitle: {
      fontFamily: Fonts.sans,
      fontWeight: '600',
      fontSize: 16,
      color: theme.textPrimary,
    },
    emptySub: {
      fontFamily: Fonts.sans,
      fontWeight: '500',
      fontSize: 13,
      color: theme.textSecondary,
      textAlign: 'center',
    },
  });
}
