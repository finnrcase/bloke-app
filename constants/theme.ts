import { Theme } from '@react-navigation/native';
import { Platform } from 'react-native';

export const colors = {
  background: '#F3F0EA',
  backgroundAlt: '#E8E1D6',
  surface: '#FFFCF7',
  surfaceAlt: '#EEE8DE',
  accentSurface: '#F7EFE1',
  surfaceDark: '#151515',
  text: '#171717',
  mutedText: '#5D5A54',
  inverseText: '#FFFCF7',
  inverseMuted: '#E9E1D3',
  border: '#D7D0C4',
  borderStrong: '#AFA598',
  accentBorder: '#DFCFB2',
  black: '#050505',
  white: '#FFFFFF',
  charcoal: '#20201E',
  gold: '#B08A45',
  clay: '#A65F3E',
  olive: '#667153',
  success: '#2F5D50',
  successSurface: '#E7EFE9',
  successBorder: '#B8D0C0',
  warning: '#8A5A22',
  danger: '#7A2E2E',
  disabled: '#A9A39A',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const borderRadius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const radius = borderRadius;

export const typography = {
  eyebrow: 13,
  caption: 14,
  body: 18,
  bodyLarge: 20,
  title: 28,
  titleLarge: 36,
  hero: 48,
} as const;

export const shadows = {
  card: Platform.select({
    web: {
      boxShadow: '0 10px 24px rgba(0, 0, 0, 0.08)',
    },
    default: {
      elevation: 3,
      shadowColor: '#000000',
      shadowOffset: { height: 10, width: 0 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
    },
  }),
  lift: Platform.select({
    web: {
      boxShadow: '0 14px 30px rgba(0, 0, 0, 0.14)',
    },
    default: {
      elevation: 5,
      shadowColor: '#000000',
      shadowOffset: { height: 14, width: 0 },
      shadowOpacity: 0.14,
      shadowRadius: 30,
    },
  }),
} as const;

export const navigationTheme: Theme = {
  dark: false,
  colors: {
    primary: colors.black,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.gold,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '600' },
    bold: { fontFamily: 'System', fontWeight: '800' },
    heavy: { fontFamily: 'System', fontWeight: '900' },
  },
};
