import { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type HeroSectionProps = {
  eyebrow?: string;
  icon?: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  subtitle?: string;
  title: string;
};

export function HeroSection({ eyebrow, icon: Icon, subtitle, title }: HeroSectionProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      {eyebrow || Icon ? (
        <View style={styles.eyebrowRow}>
          {Icon ? <Icon color={theme.accent} size={18} strokeWidth={2.6} /> : null}
          {eyebrow ? <Text style={[styles.eyebrow, { color: theme.accent }]}>{eyebrow}</Text> : null}
        </View>
      ) : null}
      <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  eyebrowRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  eyebrow: {
    fontSize: typography.eyebrow,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: typography.hero,
    fontWeight: '900',
    lineHeight: 56,
  },
  subtitle: {
    fontSize: typography.bodyLarge,
    fontWeight: '700',
    lineHeight: 30,
  },
});
