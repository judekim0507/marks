import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppThemeProvider, useAppTheme } from '@/components/theme-context';
import { AuthProvider } from '@/providers/auth-context';
import { SchoolProviderRoot } from '@/providers/context';

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { theme } = useAppTheme();

  // Once the app is up, the root background follows the active theme so the
  // blue splash overlay fades straight into the themed content.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.background).catch(() => {});
  }, [theme.background]);

  return (
    <ThemeProvider value={theme.dark ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
        }}>
        <Stack.Screen
          name="signin"
          options={{
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="course/[id]"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [1.0],
            sheetGrabberVisible: true,
          }}
        />
        <Stack.Screen
          name="transcript"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [1.0],
            sheetGrabberVisible: true,
          }}
        />
        <Stack.Screen
          name="attendance"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [1.0],
            sheetGrabberVisible: true,
          }}
        />
        <Stack.Screen
          name="schedule"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [1.0],
            sheetGrabberVisible: true,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [1.0],
            sheetGrabberVisible: true,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SchoolProviderRoot>
        <AppThemeProvider>
          <RootStack />
        </AppThemeProvider>
      </SchoolProviderRoot>
    </AuthProvider>
  );
}
