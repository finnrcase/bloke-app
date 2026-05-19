import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { borderRadius, colors, shadows, spacing } from '@/constants/theme';

type AppCardProps = PropsWithChildren<{
  elevated?: boolean;
  muted?: boolean;
  style?: StyleProp<ViewStyle>;
  tone?: 'light' | 'dark' | 'accent';
}>;

export function AppCard({ children, elevated = true, muted, style, tone = 'light' }: AppCardProps) {
  return (
    <View
      style={[
        styles.card,
        elevated ? shadows.card : null,
        muted ? styles.muted : null,
        tone === 'dark' ? styles.dark : null,
        tone === 'accent' ? styles.accent : null,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  muted: {
    backgroundColor: colors.surfaceAlt,
  },
  dark: {
    backgroundColor: colors.surfaceDark,
    borderColor: colors.surfaceDark,
  },
  accent: {
    backgroundColor: colors.accentSurface,
    borderColor: colors.accentBorder,
  },
});
