import { Theme } from '@react-navigation/native';
import { Platform } from 'react-native';

const palette = {
  background: '#F6F1E8',
  backgroundAlt: '#E9DED0',
  surface: '#FFF9EF',
  surfaceAlt: '#EFE3D2',
  glass: 'rgba(255, 249, 239, 0.78)',
  accentSurface: '#F4E3C4',
  surfaceDark: '#11100E',
  surfaceDarkAlt: '#1E1A16',
  text: '#151311',
  mutedText: '#625A50',
  inverseText: '#FFF9EF',
  inverseMuted: '#CFC2B1',
  border: '#D9CAB8',
  borderStrong: '#B59F88',
  accentBorder: '#C49A55',
  black: '#050505',
  white: '#FFFFFF',
  charcoal: '#201C18',
  charcoalSoft: '#2B251F',
  gold: '#C89B4A',
  bronze: '#8C5D2F',
  clay: '#A86142',
  olive: '#697656',
  success: '#2F5D50',
  successSurface: '#E7EFE9',
  successBorder: '#B8D0C0',
  warning: '#8A5A22',
  danger: '#7A2E2E',
  disabled: '#A9A39A',
} as const;

export const lightTheme = {
  name: 'light',
  background: palette.background,
  backgroundAlt: palette.backgroundAlt,
  surface: palette.surface,
  surfaceAlt: palette.surfaceAlt,
  card: palette.surface,
  cardMuted: palette.surfaceAlt,
  cardElevated: '#FFFDF7',
  cardInverted: palette.surfaceDark,
  glass: 'rgba(255, 249, 239, 0.86)',
  glassMuted: 'rgba(239, 227, 210, 0.78)',
  textPrimary: palette.text,
  textSecondary: '#4D463D',
  textMuted: palette.mutedText,
  textInverse: palette.inverseText,
  textInverseMuted: palette.inverseMuted,
  accent: palette.gold,
  accentText: palette.black,
  accentSurface: palette.accentSurface,
  accentBorder: palette.accentBorder,
  border: palette.border,
  borderStrong: palette.borderStrong,
  success: palette.success,
  successSurface: palette.successSurface,
  successBorder: palette.successBorder,
  warning: palette.warning,
  error: palette.danger,
  disabled: palette.disabled,
  overlay: 'rgba(5, 5, 5, 0.48)',
  shadow: 'rgba(31, 23, 15, 0.14)',
  progressTrack: 'rgba(98, 90, 80, 0.16)',
  subtleGlow: 'rgba(200, 155, 74, 0.16)',
  mapSurface: palette.surfaceDark,
  tierBronze: '#A37B4D',
  tierSilver: '#9C9890',
  tierGold: '#C89B4A',
} as const;

export const darkTheme = {
  name: 'dark',
  background: '#070605',
  backgroundAlt: '#100E0C',
  surface: '#15120F',
  surfaceAlt: '#211B16',
  card: '#191510',
  cardMuted: '#241F19',
  cardElevated: '#211B16',
  cardInverted: '#0F0D0A',
  glass: 'rgba(26, 22, 18, 0.86)',
  glassMuted: 'rgba(34, 29, 24, 0.82)',
  textPrimary: '#FFF7EA',
  textSecondary: '#D9CDBB',
  textMuted: '#AFA08D',
  textInverse: '#FFF7EA',
  textInverseMuted: '#CFC2B1',
  accent: '#D1A24F',
  accentText: '#100D09',
  accentSurface: '#332514',
  accentBorder: '#856334',
  border: 'rgba(255, 249, 239, 0.14)',
  borderStrong: 'rgba(255, 249, 239, 0.26)',
  success: '#81C3A5',
  successSurface: '#14261F',
  successBorder: '#356852',
  warning: '#E0AE66',
  error: '#F29A92',
  disabled: '#70685E',
  overlay: 'rgba(0, 0, 0, 0.62)',
  shadow: 'rgba(0, 0, 0, 0.44)',
  progressTrack: 'rgba(255, 249, 239, 0.14)',
  subtleGlow: 'rgba(209, 162, 79, 0.22)',
  mapSurface: '#11100E',
  tierBronze: '#C89271',
  tierSilver: '#C8C2B4',
  tierGold: '#D1A24F',
} as const;

export const themes = {
  dark: darkTheme,
  light: lightTheme,
} as const;

export type AppThemeName = keyof typeof themes;
export type AppTheme = (typeof themes)[AppThemeName];

export const colors = {
  ...palette,
  card: lightTheme.card,
  cardMuted: lightTheme.cardMuted,
  cardElevated: lightTheme.cardElevated,
  textPrimary: lightTheme.textPrimary,
  textSecondary: lightTheme.textSecondary,
  textMuted: lightTheme.textMuted,
  textInverse: lightTheme.textInverse,
  textInverseMuted: lightTheme.textInverseMuted,
  accent: lightTheme.accent,
  error: lightTheme.error,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  display: 84,
} as const;

export const borderRadius = {
  sm: 12,
  md: 18,
  lg: 28,
  xl: 36,
  xxl: 44,
  pill: 999,
} as const;

export const radius = borderRadius;

export const fonts = {
  display: {
    medium: 'SpaceGrotesk_500Medium',
    semibold: 'SpaceGrotesk_600SemiBold',
    bold: 'SpaceGrotesk_700Bold',
  },
  body: {
    regular: 'Manrope_400Regular',
    medium: 'Manrope_500Medium',
    semibold: 'Manrope_600SemiBold',
    bold: 'Manrope_700Bold',
    heavy: 'Manrope_800ExtraBold',
  },
} as const;

export const typography = {
  eyebrow: 13,
  caption: 14,
  body: 18,
  bodyLarge: 20,
  title: 28,
  titleLarge: 36,
  hero: 52,
  display: 64,
} as const;

export const shadows = {
  card: Platform.select({
    web: {
      boxShadow: '0 18px 48px rgba(31, 23, 15, 0.12)',
    },
    default: {
      elevation: 3,
      shadowColor: '#000000',
      shadowOffset: { height: 14, width: 0 },
      shadowOpacity: 0.12,
      shadowRadius: 26,
    },
  }),
  lift: Platform.select({
    web: {
      boxShadow: '0 26px 70px rgba(24, 18, 12, 0.22)',
    },
    default: {
      elevation: 5,
      shadowColor: '#000000',
      shadowOffset: { height: 22, width: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 38,
    },
  }),
  glow: Platform.select({
    web: {
      boxShadow: '0 22px 70px rgba(200, 155, 74, 0.28)',
    },
    default: {
      elevation: 6,
      shadowColor: '#C89B4A',
      shadowOffset: { height: 18, width: 0 },
      shadowOpacity: 0.28,
      shadowRadius: 34,
    },
  }),
} as const;

export function createNavigationTheme(theme: AppTheme): Theme {
  return {
    dark: theme.name === 'dark',
    colors: {
      primary: theme.accent,
      background: theme.background,
      card: theme.surface,
      text: theme.textPrimary,
      border: theme.border,
      notification: theme.accent,
    },
    fonts: {
      regular: { fontFamily: 'Manrope_400Regular', fontWeight: '400' },
      medium: { fontFamily: 'Manrope_600SemiBold', fontWeight: '600' },
      bold: { fontFamily: 'Manrope_700Bold', fontWeight: '800' },
      heavy: { fontFamily: 'Manrope_800ExtraBold', fontWeight: '900' },
    },
  };
}

export const navigationTheme: Theme = {
  dark: false,
  colors: {
    primary: lightTheme.accent,
    background: lightTheme.background,
    card: lightTheme.surface,
    text: lightTheme.textPrimary,
    border: lightTheme.border,
    notification: lightTheme.accent,
  },
  fonts: {
    regular: { fontFamily: 'Manrope_400Regular', fontWeight: '400' },
    medium: { fontFamily: 'Manrope_600SemiBold', fontWeight: '600' },
    bold: { fontFamily: 'Manrope_700Bold', fontWeight: '800' },
    heavy: { fontFamily: 'Manrope_800ExtraBold', fontWeight: '900' },
  },
};
