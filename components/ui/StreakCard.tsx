import { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/ui/GlassCard';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type StreakCardProps = {
  icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  label: string;
  value: string;
};

export function StreakCard({ icon: Icon, label, value }: StreakCardProps) {
  const theme = useTheme();

  return (
    <GlassCard style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: theme.accentSurface }]}>
        <Icon color={theme.accent} size={22} strokeWidth={2.7} />
      </View>
      <Text style={[styles.value, { color: theme.textPrimary }]}>{value}</Text>
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 18,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  value: {
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 38,
    marginTop: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
