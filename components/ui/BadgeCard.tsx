import { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type BadgeCardProps = {
  icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  locked?: boolean;
  subtitle?: string;
  title: string;
};

export function BadgeCard({ icon: Icon, locked, subtitle, title }: BadgeCardProps) {
  const theme = useTheme();

  return (
    <GlassCard muted={locked} style={[styles.card, locked ? styles.locked : null]}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: locked ? theme.progressTrack : theme.accentSurface },
        ]}>
        <Icon color={locked ? theme.disabled : theme.accent} size={24} strokeWidth={2.7} />
      </View>
      <Text style={[styles.title, { color: locked ? theme.textMuted : theme.textPrimary }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: locked ? theme.textMuted : theme.textSecondary }]}>
          {subtitle}
        </Text>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 148,
  },
  locked: {
    opacity: 0.72,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 20,
    height: 48,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    width: 48,
  },
  title: {
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: spacing.xs,
  },
});
