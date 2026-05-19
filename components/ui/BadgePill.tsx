import { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { borderRadius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type IconComponent = ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;

type BadgePillProps = {
  icon?: IconComponent;
  label: string;
  locked?: boolean;
};

export function BadgePill({ icon: Icon, label, locked }: BadgePillProps) {
  const theme = useTheme();
  const color = locked ? theme.disabled : theme.textPrimary;

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: locked ? theme.cardMuted : theme.accentSurface,
          borderColor: locked ? theme.border : theme.accentBorder,
        },
      ]}>
      {Icon ? <Icon color={color} size={16} strokeWidth={2.4} /> : null}
      <Text style={[styles.label, { color }]}>{label}</Text>
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
  label: {
    fontSize: 14,
    fontWeight: '900',
  },
});
