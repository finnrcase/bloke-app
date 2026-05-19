import { AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export function useThemeColor(token: keyof AppTheme) {
  const theme = useTheme();
  return theme[token];
}
