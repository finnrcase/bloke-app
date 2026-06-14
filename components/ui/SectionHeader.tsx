import { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fonts, spacing, typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type IconComponent = ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;

type SectionHeaderProps = {
  eyebrow?: string;
  icon?: IconComponent;
  subtitle?: string;
  title: string;
};

export function SectionHeader({ eyebrow, icon: Icon, subtitle, title }: SectionHeaderProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        {Icon ? <Icon color={theme.accent} size={22} strokeWidth={2.5} /> : null}
        <View style={styles.copy}>
          {eyebrow ? <Text style={[styles.eyebrow, { color: theme.accent }]}>{eyebrow}</Text> : null}
          <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
        </View>
      </View>
      {subtitle ? <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrow: {
    fontFamily: fonts.body.bold,
    fontSize: typography.eyebrow,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fonts.display.bold,
    fontSize: typography.title,
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: fonts.body.medium,
    fontSize: typography.body,
    lineHeight: 27,
  },
});
