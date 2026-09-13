import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path } from 'react-native-svg';

import { SquircleView } from '@/components/squircle-view';
import { useAppTheme } from '@/components/theme-context';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/providers/auth-context';

const feedbackEasing = Easing.bezier(0.2, 0, 0, 1);

function EyeIcon({ color, open }: { color: string; open: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      {open ? (
        <Path
          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <Path
          d="M3 3l18 18 M10.5 5.2A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 3.9 M6.6 6.6C4 8.2 2 12 2 12s3.5 7 10 7a10.6 10.6 0 0 0 4-.8 M9.9 9.9a3 3 0 0 0 4.2 4.2"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

/**
 * Reading this as: student companion app sign-in for teens,
 * with a quiet premium-minimal language, leaning toward the
 * existing Graphite theme + squircles + single-accent restraint.
 */
export default function SignInScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { status, error, progress, signIn, clearError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const busy = status === 'signing-in' || status === 'restoring';
  const hasInput = username.trim().length > 0 && password.length >= 4;
  const canSubmit = hasInput && !busy;

  // Eye toggle press scale + icon transition.
  const eyePressed = useSharedValue(0);
  const eyeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - eyePressed.value * 0.12 }],
    opacity: 1 - eyePressed.value * 0.4,
  }));

  // Submit button opacity follows canSubmit with a 180ms settle.
  const buttonOpacity = useSharedValue(canSubmit ? 1 : 0.45);
  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  // Shake the card on bad credentials.
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  useEffect(() => {
    if (status === 'signed-in') router.replace('/');
  }, [status, router]);

  useEffect(() => {
    buttonOpacity.value = withTiming(canSubmit ? 1 : 0.45, {
      duration: 180,
      easing: feedbackEasing,
    });
  }, [canSubmit, buttonOpacity]);

  useEffect(() => {
    if (error?.code === 'INVALID_CREDENTIALS') {
      shakeX.value = withSequence(
        withTiming(-6, { duration: 60, easing: feedbackEasing }),
        withTiming(6, { duration: 60, easing: feedbackEasing }),
        withTiming(-4, { duration: 60, easing: feedbackEasing }),
        withTiming(4, { duration: 60, easing: feedbackEasing }),
        withTiming(0, { duration: 60, easing: feedbackEasing }),
      );
    }
  }, [error, shakeX]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.screen, { backgroundColor: theme.background }]}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        <View style={styles.brand}>
          <Text style={[styles.wordmark, { color: theme.textPrimary }]}>
            marks
          </Text>
          <Text style={[styles.tagline, { color: theme.sectionLabel }]}>
            Your term, at a glance.
          </Text>
        </View>

        <Animated.View style={shakeStyle}>
        <SquircleView
          style={styles.card}
          backgroundColor={theme.card}
          cornerRadius={24}
          cornerSmoothing={0.75}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
            Sign in with MyEd
          </Text>
          <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
            MyEducation BC · Follett Aspen
          </Text>

          <Text style={[styles.label, { color: theme.sectionLabel }]}>
            Student ID
          </Text>
          <TextInput
            value={username}
            onChangeText={(v) => {
              setUsername(v);
              if (error) clearError();
            }}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            importantForAutofill="no"
            autoFocus
            returnKeyType="next"
            showSoftInputOnFocus
            placeholder="e.g. judokim"
            placeholderTextColor={theme.textMuted}
            editable={!busy}
            style={[
              styles.input,
              {
                color: theme.textPrimary,
                borderColor: error ? '#f87171' : theme.separator,
                backgroundColor: theme.highlight,
              },
            ]}
          />

          <Text style={[styles.label, { color: theme.sectionLabel }]}>
            Password
          </Text>
          <View
            style={[
              styles.passwordWrap,
              {
                borderColor: error ? '#f87171' : theme.separator,
                backgroundColor: theme.highlight,
              },
            ]}>
            <TextInput
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (error) clearError();
              }}
              secureTextEntry={!showPassword}
              autoComplete="off"
              importantForAutofill="no"
              placeholder="••••••••"
              placeholderTextColor={theme.textMuted}
              editable={!busy}
              returnKeyType="done"
              showSoftInputOnFocus
              onSubmitEditing={() => canSubmit && signIn(username, password)}
              style={[styles.passwordInput, { color: theme.textPrimary }]}
            />
            <Pressable
              onPress={() => setShowPassword((s) => !s)}
              onPressIn={() => {
                eyePressed.value = withTiming(1, {
                  duration: 100,
                  easing: feedbackEasing,
                });
              }}
              onPressOut={() => {
                eyePressed.value = withTiming(0, {
                  duration: 180,
                  easing: feedbackEasing,
                });
              }}
              hitSlop={12}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              accessibilityRole="button"
              style={styles.eye}>
              <Animated.View style={eyeStyle}>
                <Animated.View
                  key={showPassword ? 'eye-open' : 'eye-closed'}
                  entering={FadeIn.duration(160)}
                  exiting={FadeOut.duration(120)}>
                  <EyeIcon color={theme.textPrimary} open={showPassword} />
                </Animated.View>
              </Animated.View>
            </Pressable>
          </View>

          {error ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error.message}
            </Text>
          ) : busy && progress ? (
            <Text style={[styles.hint, { color: theme.textMuted }]}>
              {progress}
            </Text>
          ) : (
            <Text style={[styles.hint, { color: theme.textMuted }]}>
              {hasInput
                ? 'Use your MyEd BC Student ID and password'
                : 'Enter your Student ID and password to continue'}
            </Text>
          )}

          <Animated.View style={buttonStyle}>
          <Pressable
            onPress={() => canSubmit && signIn(username, password)}
            style={[
              styles.button,
              {
                backgroundColor: theme.trackFill,
              },
            ]}>
              <Animated.View
                key={busy ? 'busy' : 'idle'}
                style={styles.buttonContent}
                entering={FadeIn.duration(180)}
                exiting={FadeOut.duration(120)}>
                {busy ? (
                  <ActivityIndicator
                    color={theme.background}
                    style={styles.spinner}
                  />
                ) : (
                  <Text style={[styles.buttonText, { color: theme.background }]}>
                    Sign in
                  </Text>
                )}
              </Animated.View>
          </Pressable>
          </Animated.View>
        </SquircleView>
        </Animated.View>

        <Text style={[styles.foot, { color: theme.textMuted }]}>
          Session stays on this device · Demo: demo / demo1234
        </Text>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center' },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 28,
  },
  brand: { alignItems: 'center', gap: 6 },
  wordmark: {
    fontFamily: Fonts.rounded,
    fontWeight: '600',
    fontSize: 44,
    letterSpacing: -1.76,
  },
  tagline: { fontFamily: Fonts.sans, fontWeight: '500', fontSize: 15 },
  card: { paddingHorizontal: 22, paddingVertical: 24, gap: 6 },
  cardTitle: {
    fontFamily: Fonts.rounded,
    fontWeight: '600',
    fontSize: 22,
    letterSpacing: -0.4,
  },
  cardSub: {
    fontFamily: Fonts.sans,
    fontWeight: '500',
    fontSize: 13,
    marginBottom: 12,
  },
  label: {
    fontFamily: Fonts.sans,
    fontWeight: '500',
    fontSize: 13,
    marginTop: 8,
  },
  input: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginTop: 6,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    marginTop: 6,
    paddingRight: 8,
  },
  passwordInput: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  eye: { padding: 8 },
  hint: { fontFamily: Fonts.sans, fontSize: 12, marginTop: 10 },
  error: {
    fontFamily: Fonts.sans,
    fontWeight: '500',
    fontSize: 13,
    color: '#f87171',
    marginTop: 10,
  },
  button: {
    marginTop: 16,
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  buttonText: {
    fontFamily: Fonts.rounded,
    fontWeight: '600',
    fontSize: 17,
    textAlign: 'center',
  },
  spinner: { alignSelf: 'center' },
  foot: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    textAlign: 'center',
  },
});