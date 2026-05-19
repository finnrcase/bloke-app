import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { borderRadius, shadows, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type GradientCardProps = PropsWithChildren<{
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
  variant?: 'dark' | 'bronze' | 'olive' | 'light';
}>;

export function GradientCard({ children, glow, style, variant = 'dark' }: GradientCardProps) {
  const theme = useTheme();
  const variantStyle =
    variant === 'light'
      ? { backgroundColor: theme.card, borderColor: theme.border }
      : variant === 'bronze'
        ? { backgroundColor: theme.isDark ? '#211710' : '#2B1B10', borderColor: theme.accentBorder }
        : variant === 'olive'
          ? { backgroundColor: theme.isDark ? '#1D2118' : '#26301E', borderColor: theme.borderStrong }
          : { backgroundColor: theme.cardInverted, borderColor: theme.isDark ? theme.border : 'rgba(255, 249, 239, 0.12)' };

  return (
    <View style={[styles.card, variantStyle, glow ? shadows.glow : shadows.lift, style]}>
      <View pointerEvents="none" style={[styles.orb, styles.primaryOrb]} />
      <View pointerEvents="none" style={[styles.orb, styles.secondaryOrb]} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    padding: spacing.lg,
    position: 'relative',
  },
  orb: {
    borderRadius: 999,
    position: 'absolute',
  },
  primaryOrb: {
    backgroundColor: 'rgba(200, 155, 74, 0.32)',
    height: 190,
    right: -70,
    top: -80,
    width: 190,
  },
  secondaryOrb: {
    backgroundColor: 'rgba(168, 97, 66, 0.22)',
    bottom: -90,
    height: 210,
    left: -90,
    width: 210,
  },
  content: {
    gap: spacing.lg,
    position: 'relative',
    zIndex: 1,
  },
});
