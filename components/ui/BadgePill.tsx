import { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { borderRadius, colors, spacing } from '@/constants/theme';

type IconComponent = ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;

type BadgePillProps = {
  icon?: IconComponent;
  label: string;
  locked?: boolean;
};

export function BadgePill({ icon: Icon, label, locked }: BadgePillProps) {
  const color = locked ? colors.disabled : colors.text;

  return (
    <View style={[styles.pill, locked ? styles.locked : styles.earned]}>
      {Icon ? <Icon color={color} size={16} strokeWidth={2.4} /> : null}
      <Text style={[styles.label, locked ? styles.lockedText : styles.earnedText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  earned: {
    backgroundColor: colors.accentSurface,
    borderColor: colors.accentBorder,
  },
  locked: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
  },
  label: {
    fontSize: 14,
    fontWeight: '900',
  },
  earnedText: {
    color: colors.text,
  },
  lockedText: {
    color: colors.disabled,
  },
});
