import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ChevronRightIcon } from '@/components/icons';
import { NativeColorPicker } from '@/components/native-color-picker';
import { PressableHighlight } from '@/components/pressable-highlight';
import { SquircleView } from '@/components/squircle-view';
import { useAppTheme } from '@/components/theme-context';
import { useSchool } from '@/providers/context';
import { useAuth, useSessionProvider } from '@/providers/auth-context';
import {
  Fonts,
  Themes,
  themeFromColor,
  type AppTheme,
  type ThemeName,
} from '@/constants/theme';

const PREFERENCES = [
  { id: 'notifications', label: 'Notifications', value: 'On' },
  { id: 'grade-format', label: 'Grade format', value: 'Percent' },
  { id: 'default-term', label: 'Default term', value: 'Term 1' },
];

const THEME_NAMES = Object.keys(Themes) as ThemeName[];

function cardCorners(index: number, count: number) {
  if (index === 0) return { topLeft: 24, topRight: 24 };
  if (index === count - 1) return { bottomLeft: 24, bottomRight: 24 };
  return undefined;
}

export default function SettingsScreen() {
  const { theme, themeName, customColor, setThemeName, setCustomColor } =
    useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {
    signOut,
    signingOut,
    students,
    activeStudentId,
    switchingStudent,
    switchError,
    switchStudent,
    refreshStudents,
    progress: switchProgress,
  } = useAuth();
  const [studentOpen, setStudentOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const { session } = useAuth();
  const isLive = session?.kind === 'live';
  // Parent accounts sometimes miss child discovery at login — retry quietly
  // when settings opens with a live session and no children known yet.
  useEffect(() => {
    refreshStudents();
  }, [refreshStudents]);
  const activeStudent =
    students.find((s) => s.id === activeStudentId) ?? students[0];
  const sessionSchool = useSessionProvider();
  const fallback = useSchool();
  const school = sessionSchool ?? fallback;
  const customPreview = useMemo(
    () => themeFromColor(customColor),
    [customColor],
  );

  const showStudentSection =
    students.length > 1 && activeStudent !== undefined;
  // Live sessions with 0-1 known children: show lookup state + manual
  // retry instead of nothing (the old silent failure).
  const showLookupRow = isLive && !showStudentSection;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{school.profile.initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{school.profile.name}</Text>
          <Text style={styles.profileDetail}>{school.profile.detail}</Text>
        </View>
      </View>

      {showStudentSection && activeStudent ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Student</Text>
          <SquircleView
            style={styles.card}
            backgroundColor={theme.card}
            cornerRadius={24}
            cornerSmoothing={0.75}>
            <PressableHighlight
              onPress={() => setStudentOpen(!studentOpen)}
              style={[styles.row, styles.rowBorder]}
              contentStyle={styles.rowContent}
              cornerSmoothing={0.75}
              cornerRadii={{ topLeft: 24, topRight: 24 }}
              accessibilityRole="button"
              accessibilityLabel={`Viewing ${activeStudent.name}. Change student`}>
              <View style={styles.rowInner}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {activeStudent.name}
                </Text>
                <View style={styles.rowRight}>
                  {switchingStudent ? (
                    <ActivityIndicator color={theme.textSecondary} />
                  ) : (
                    <View
                      style={{
                        transform: [
                          { rotate: studentOpen ? '90deg' : '0deg' },
                        ],
                      }}>
                      <ChevronRightIcon
                        color={theme.textMuted}
                        width={5.5}
                        height={10}
                      />
                    </View>
                  )}
                </View>
              </View>
            </PressableHighlight>
            {studentOpen ? (
              students.map((student, index) => {
                const isActive = student.id === activeStudentId;
                const isLast = index === students.length - 1;
                return (
                  <PressableHighlight
                    key={student.id}
                    onPress={() => {
                      if (!switchingStudent && !isActive) {
                        switchStudent(student.id);
                      }
                    }}
                    style={[styles.row, !isLast && styles.rowBorder]}
                    contentStyle={styles.rowContent}
                    cornerSmoothing={0.75}
                    cornerRadii={
                      isLast ? { bottomLeft: 24, bottomRight: 24 } : undefined
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`View ${student.name}`}>
                    <View style={styles.rowInner}>
                      <Text
                        style={[
                          styles.rowTitle,
                          isActive && { color: theme.textMuted },
                        ]}
                        numberOfLines={1}>
                        {student.name}
                      </Text>
                      {isActive ? (
                        <Text style={styles.check}>✓</Text>
                      ) : null}
                    </View>
                  </PressableHighlight>
                );
              })
            ) : null}
          </SquircleView>
          {switchError ? (
            <Text style={styles.switchError}>{switchError}</Text>
          ) : (
            <Text style={[styles.footnote, { color: theme.textMuted }]}>
              {switchingStudent && switchProgress
                ? switchProgress
                : `${students.length} children on this account`}
            </Text>
          )}
        </View>
      ) : null}

      {showLookupRow ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Student</Text>
          <SquircleView
            style={styles.card}
            backgroundColor={theme.card}
            cornerRadius={24}
            cornerSmoothing={0.75}>
            <PressableHighlight
              onPress={async () => {
                if (retrying) return;
                setRetrying(true);
                try {
                  await refreshStudents();
                } finally {
                  setRetrying(false);
                }
              }}
              style={styles.row}
              contentStyle={styles.rowContent}
              cornerSmoothing={0.75}
              cornerRadius={24}
              accessibilityRole="button"
              accessibilityLabel="Look for linked students">
              <View style={styles.rowInner}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {retrying
                    ? 'Looking for students…'
                    : students.length === 1
                      ? `1 child found: ${students[0].name}`
                      : 'Look for linked students'}
                </Text>
                <View style={styles.rowRight}>
                  {retrying ? (
                    <ActivityIndicator color={theme.textSecondary} />
                  ) : (
                    <ChevronRightIcon
                      color={theme.textMuted}
                      width={5.5}
                      height={10}
                    />
                  )}
                </View>
              </View>
            </PressableHighlight>
          </SquircleView>
          {switchError ? (
            <Text style={styles.switchError}>{switchError}</Text>
          ) : (
            <Text style={[styles.footnote, { color: theme.textMuted }]}>
              {students.length === 1
                ? 'Only one child found — if there should be two, tap to retry.'
                : 'Parent accounts list each child here. Tap to retry.'}
            </Text>
          )}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Appearance</Text>
        <SquircleView
          style={styles.card}
          backgroundColor={theme.card}
          cornerRadius={24}
          cornerSmoothing={0.75}>
          {THEME_NAMES.map((name, index) => {
            const option = Themes[name];
            return (
              <PressableHighlight
                key={name}
                onPress={() => setThemeName(name)}
                style={[styles.row, styles.rowBorder]}
                contentStyle={styles.rowContent}
                cornerSmoothing={0.75}
                cornerRadii={cardCorners(index, THEME_NAMES.length + 1)}>
                <View style={styles.rowInner}>
                  <View style={styles.rowLeft}>
                    <View
                      style={[
                        styles.swatch,
                        { backgroundColor: option.background },
                      ]}>
                      <View
                        style={[
                          styles.swatchDot,
                          { backgroundColor: option.trackFill },
                        ]}
                      />
                    </View>
                    <Text style={styles.rowTitle}>{option.label}</Text>
                  </View>
                  {name === themeName && <Text style={styles.check}>✓</Text>}
                </View>
              </PressableHighlight>
            );
          })}
          <PressableHighlight
            onPress={() => setThemeName('custom')}
            style={styles.row}
            contentStyle={styles.rowContent}
            cornerSmoothing={0.75}
            cornerRadii={{ bottomLeft: 24, bottomRight: 24 }}>
            <View style={styles.rowInner}>
              <View style={styles.rowLeft}>
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: customPreview.background },
                  ]}>
                  <View
                    style={[
                      styles.swatchDot,
                      { backgroundColor: customPreview.trackFill },
                    ]}
                  />
                </View>
                <Text style={styles.rowTitle}>Custom</Text>
              </View>
              <View style={styles.rowRight}>
                {themeName === 'custom' && <Text style={styles.check}>✓</Text>}
                <NativeColorPicker
                  color={customColor}
                  onChange={setCustomColor}
                />
              </View>
            </View>
          </PressableHighlight>
        </SquircleView>
        <Text style={styles.footnote}>
          Pick your own colour — light or dark follows the shade.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Preferences</Text>
        <SquircleView
          style={styles.card}
          backgroundColor={theme.card}
          cornerRadius={24}
          cornerSmoothing={0.75}>
          {PREFERENCES.map((preference, index) => (
            <PressableHighlight
              key={preference.id}
              style={[
                styles.row,
                index < PREFERENCES.length - 1 && styles.rowBorder,
              ]}
              contentStyle={styles.rowContent}
              cornerSmoothing={0.75}
              cornerRadii={cardCorners(index, PREFERENCES.length)}>
              <View style={styles.rowInner}>
                <Text style={styles.rowTitle}>{preference.label}</Text>
                <View style={styles.rowRight}>
                  <Text style={styles.rowValue}>{preference.value}</Text>
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
      </View>

      <View style={styles.section}>
        <SquircleView
          style={styles.card}
          backgroundColor={theme.card}
          cornerRadius={24}
          cornerSmoothing={0.75}>
          <PressableHighlight
            style={styles.row}
            onPress={() =>
              Alert.alert('Sign out?', 'You can sign back in anytime.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
              ])
            }
            contentStyle={styles.rowContent}
            cornerSmoothing={0.75}
            cornerRadius={24}>
            <View style={styles.rowInner}>
              {signingOut ? (
                <ActivityIndicator color={theme.dark ? '#f87171' : '#dc2626'} />
              ) : (
                <Text style={styles.signOut}>Sign Out</Text>
              )}
            </View>
          </PressableHighlight>
        </SquircleView>
        <Text style={styles.version}>Marks 1.0.0</Text>
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
    profile: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginTop: 28,
      paddingHorizontal: 20,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontFamily: Fonts.rounded,
      fontWeight: '600',
      fontSize: 20,
      color: theme.textSecondary,
    },
    profileInfo: {
      gap: 3,
    },
    profileName: {
      fontFamily: Fonts.sans,
      fontWeight: '600',
      fontSize: 22,
      color: theme.textPrimary,
    },
    profileDetail: {
      fontFamily: Fonts.sans,
      fontWeight: '500',
      fontSize: 14,
      color: theme.textSecondary,
    },
    section: {
      marginTop: 28,
      paddingHorizontal: 20,
      gap: 12,
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
    row: {
      height: 56,
    },
    rowContent: {
      flex: 1,
      paddingHorizontal: 20,
      justifyContent: 'center',
    },
    rowBorder: {
      borderBottomWidth: 2,
      borderBottomColor: theme.separator,
    },
    rowInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    rowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    rowValue: {
      fontFamily: Fonts.sans,
      fontWeight: '500',
      fontSize: 14,
      color: theme.textSecondary,
    },
    footnote: {
      fontFamily: Fonts.sans,
      fontWeight: '500',
      fontSize: 13,
      color: theme.textMuted,
      paddingHorizontal: 20,
      marginTop: -2,
    },
    swatch: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    swatchDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    rowTitle: {
      fontFamily: Fonts.sans,
      fontWeight: '500',
      fontSize: 15,
      color: theme.textPrimary,
    },
    check: {
      fontFamily: Fonts.rounded,
      fontWeight: '600',
      fontSize: 16,
      color: theme.trackFill,
    },
    switchError: {
      fontFamily: Fonts.sans,
      fontWeight: '500',
      fontSize: 13,
      color: '#f87171',
      paddingHorizontal: 20,
      marginTop: -2,
    },
    signOut: {
      fontFamily: Fonts.sans,
      fontWeight: '500',
      fontSize: 15,
      color: theme.dark ? '#f87171' : '#dc2626',
    },
    version: {
      fontFamily: Fonts.sans,
      fontWeight: '500',
      fontSize: 13,
      color: theme.textMuted,
      textAlign: 'center',
      marginTop: 4,
    },
  });
}
