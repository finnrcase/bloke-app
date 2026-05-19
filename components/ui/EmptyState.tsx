import { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { borderRadius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type IconComponent = ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;

type EmptyStateProps = {
  body: string;
  icon?: IconComponent;
  title: string;
};

export function EmptyState({ body, icon: Icon, title }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      {Icon ? (
        <View style={[styles.iconWrap, { backgroundColor: theme.accentSurface }]}>
          <Icon color={theme.accent} size={24} strokeWidth={2.5} />
        </View>
      ) : null}
      <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: borderRadius.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  body: {
    fontSize: 18,
    lineHeight: 28,
  },
});
