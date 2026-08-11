import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  Themes,
  themeFromColor,
  type AppTheme,
  type ThemeName,
} from '@/constants/theme';

export type ThemeSelection = ThemeName | 'custom';

type ThemeContextValue = {
  themeName: ThemeSelection;
  theme: AppTheme;
  customColor: string;
  setThemeName: (name: ThemeSelection) => void;
  setCustomColor: (color: string) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeSelection>('graphite');
  const [customColor, setColor] = useState('#38bdf8');

  const value = useMemo(() => {
    const theme =
      themeName === 'custom' ? themeFromColor(customColor) : Themes[themeName];
    return {
      themeName,
      theme,
      customColor,
      setThemeName,
      // Picking a custom color activates the custom theme.
      setCustomColor: (color: string) => {
        setColor(color);
        setThemeName('custom');
      },
    };
  }, [themeName, customColor]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used inside AppThemeProvider');
  }
  return context;
}
