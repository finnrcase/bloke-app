import { useColorScheme } from 'react-native';

import { AppThemeName, createNavigationTheme, themes } from '@/constants/theme';
import { usePreferences } from '@/context/PreferencesContext';

export function useTheme() {
  const systemScheme = useColorScheme();
  const { appearance } = usePreferences();
  const resolvedThemeName: AppThemeName =
    appearance === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : appearance;
  const theme = themes[resolvedThemeName];

  return {
    ...theme,
    colorScheme: resolvedThemeName,
    isDark: resolvedThemeName === 'dark',
    navigationTheme: createNavigationTheme(theme),
  };
}
