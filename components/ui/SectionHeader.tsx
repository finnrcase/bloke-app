import { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';

type IconComponent = ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;

type SectionHeaderProps = {
  eyebrow?: string;
  icon?: IconComponent;
  subtitle?: string;
  title: string;
};

export function SectionHeader({ eyebrow, icon: Icon, subtitle, title }: SectionHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        {Icon ? <Icon color={colors.gold} size={22} strokeWidth={2.5} /> : null}
        <View style={styles.copy}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
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
    color: colors.gold,
    fontSize: typography.eyebrow,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '900',
    lineHeight: 34,
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: typography.body,
    lineHeight: 27,
  },
});
