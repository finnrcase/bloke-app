import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { borderRadius, shadows, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type AppCardProps = PropsWithChildren<{
  elevated?: boolean;
  muted?: boolean;
  style?: StyleProp<ViewStyle>;
  tone?: 'light' | 'dark' | 'accent';
}>;

export function AppCard({ children, elevated = true, muted, style, tone = 'light' }: AppCardProps) {
  const theme = useTheme();
  const toneStyle =
    tone === 'dark'
      ? { backgroundColor: theme.cardInverted, borderColor: theme.cardInverted }
      : tone === 'accent'
        ? { backgroundColor: theme.accentSurface, borderColor: theme.accentBorder }
        : { backgroundColor: muted ? theme.cardMuted : theme.card, borderColor: theme.border };

  return (
    <View
      style={[
        styles.card,
        toneStyle,
        elevated ? shadows.card : null,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    padding: spacing.xl,
  },
});
