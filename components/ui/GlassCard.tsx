import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { borderRadius, shadows, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type GlassCardProps = PropsWithChildren<{
  muted?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function GlassCard({ children, muted, style }: GlassCardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: muted ? theme.glassMuted : theme.glass,
          borderColor: theme.border,
        },
        shadows.card,
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
    gap: spacing.md,
    padding: spacing.lg,
  },
});
