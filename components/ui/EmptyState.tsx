import { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { borderRadius, colors, spacing } from '@/constants/theme';

type IconComponent = ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;

type EmptyStateProps = {
  body: string;
  icon?: IconComponent;
  title: string;
};

export function EmptyState({ body, icon: Icon, title }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      {Icon ? (
        <View style={styles.iconWrap}>
          <Icon color={colors.gold} size={24} strokeWidth={2.5} />
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
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
    backgroundColor: colors.accentSurface,
    borderRadius: borderRadius.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  body: {
    color: colors.mutedText,
    fontSize: 18,
    lineHeight: 28,
  },
});
