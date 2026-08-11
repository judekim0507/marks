/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Tailwind CSS `neutral` palette (the shades used by the Marks design). */
export const Neutral = {
  200: '#e5e5e5',
  300: '#d4d4d4',
  400: '#a3a3a3',
  500: '#737373',
  600: '#525252',
  800: '#262626',
  900: '#171717',
} as const;

/** Semantic color roles for an app theme. Values come from Tailwind palettes. */
export type AppTheme = {
  label: string;
  dark: boolean;
  background: string;
  card: string;
  separator: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  sectionLabel: string;
  /** Dimmed letter-grade color beside big numerals. */
  gradeDim: string;
  icon: string;
  track: string;
  trackFill: string;
  highlight: string;
};

export const Themes = {
  graphite: {
    label: 'Graphite',
    dark: true,
    background: Neutral[900],
    card: Neutral[800],
    separator: Neutral[900],
    textPrimary: '#ffffff',
    textSecondary: Neutral[500],
    textMuted: Neutral[600],
    sectionLabel: Neutral[400],
    gradeDim: 'rgba(255, 255, 255, 0.4)',
    icon: Neutral[600],
    track: 'rgba(255, 255, 255, 0.06)',
    trackFill: Neutral[300],
    highlight: 'rgba(255, 255, 255, 0.03)',
  },
  ocean: {
    label: 'Ocean',
    dark: true,
    background: '#082f49', // sky-950
    card: '#0c4a6e', // sky-900
    separator: '#082f49',
    textPrimary: '#f0f9ff', // sky-50
    textSecondary: '#38bdf8', // sky-400
    textMuted: '#0284c7', // sky-600
    sectionLabel: '#bae6fd', // sky-200
    gradeDim: 'rgba(240, 249, 255, 0.4)',
    icon: '#0284c7',
    track: 'rgba(255, 255, 255, 0.08)',
    trackFill: '#bae6fd',
    highlight: 'rgba(255, 255, 255, 0.04)',
  },
  sky: {
    label: 'Sky',
    dark: false,
    background: '#e0f2fe', // sky-100
    card: '#ffffff',
    separator: '#e0f2fe',
    textPrimary: '#082f49', // sky-950
    textSecondary: '#0369a1', // sky-700
    textMuted: '#38bdf8', // sky-400
    sectionLabel: '#075985', // sky-800
    gradeDim: 'rgba(8, 47, 73, 0.4)',
    icon: '#0284c7', // sky-600
    track: 'rgba(8, 47, 73, 0.08)',
    trackFill: '#0284c7',
    highlight: 'rgba(8, 47, 73, 0.05)',
  },
  forest: {
    label: 'Forest',
    dark: true,
    background: '#022c22', // emerald-950
    card: '#064e3b', // emerald-900
    separator: '#022c22',
    textPrimary: '#ecfdf5', // emerald-50
    textSecondary: '#34d399', // emerald-400
    textMuted: '#059669', // emerald-600
    sectionLabel: '#a7f3d0', // emerald-200
    gradeDim: 'rgba(236, 253, 245, 0.4)',
    icon: '#059669',
    track: 'rgba(255, 255, 255, 0.08)',
    trackFill: '#a7f3d0',
    highlight: 'rgba(255, 255, 255, 0.04)',
  },
  rose: {
    label: 'Rosé',
    dark: false,
    background: '#ffe4e6', // rose-100
    card: '#ffffff',
    separator: '#ffe4e6',
    textPrimary: '#4c0519', // rose-950
    textSecondary: '#be123c', // rose-700
    textMuted: '#fb7185', // rose-400
    sectionLabel: '#9f1239', // rose-800
    gradeDim: 'rgba(76, 5, 25, 0.4)',
    icon: '#e11d48', // rose-600
    track: 'rgba(76, 5, 25, 0.08)',
    trackFill: '#e11d48',
    highlight: 'rgba(76, 5, 25, 0.05)',
  },
} as const satisfies Record<string, AppTheme>;

export type ThemeName = keyof typeof Themes;

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

const hsl = (h: number, s: number, l: number) =>
  `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
const hsla = (h: number, s: number, l: number, a: number) =>
  `hsla(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%, ${a})`;

/**
 * Derive a full theme from a single seed color. Whether the theme is dark or
 * light follows the shade picked: dark colors yield dark themes.
 */
export function themeFromColor(seed: string): AppTheme {
  const { h, s: rawS, l } = hexToHsl(seed);
  const s = Math.min(Math.max(rawS, 0.08), 0.9);
  const dark = l < 0.55;

  if (dark) {
    return {
      label: 'Custom',
      dark: true,
      background: hsl(h, s * 0.45, 0.09),
      card: hsl(h, s * 0.45, 0.16),
      separator: hsl(h, s * 0.45, 0.09),
      textPrimary: hsl(h, s * 0.3, 0.97),
      textSecondary: hsl(h, Math.min(s, 0.7), 0.62),
      textMuted: hsl(h, Math.min(s, 0.6), 0.42),
      sectionLabel: hsl(h, s * 0.5, 0.8),
      gradeDim: hsla(h, s * 0.3, 0.97, 0.4),
      icon: hsl(h, Math.min(s, 0.6), 0.42),
      track: 'rgba(255, 255, 255, 0.08)',
      trackFill: hsl(h, s * 0.5, 0.85),
      highlight: 'rgba(255, 255, 255, 0.04)',
    };
  }
  return {
    label: 'Custom',
    dark: false,
    background: hsl(h, s * 0.7, 0.92),
    card: '#ffffff',
    separator: hsl(h, s * 0.7, 0.92),
    textPrimary: hsl(h, s * 0.8, 0.12),
    textSecondary: hsl(h, Math.min(s, 0.75), 0.34),
    textMuted: hsl(h, s * 0.7, 0.66),
    sectionLabel: hsl(h, s * 0.7, 0.24),
    gradeDim: hsla(h, s * 0.8, 0.12, 0.4),
    icon: hsl(h, s * 0.7, 0.45),
    track: hsla(h, s * 0.8, 0.12, 0.08),
    trackFill: hsl(h, s * 0.7, 0.45),
    highlight: hsla(h, s * 0.8, 0.12, 0.05),
  };
}

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
