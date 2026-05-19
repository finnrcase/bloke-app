import { StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTheme } from '@/hooks/useTheme';

type MilestoneCardProps = {
  label: string;
  progress: number;
  title: string;
};

export function MilestoneCard({ label, progress, title }: MilestoneCardProps) {
  const theme = useTheme();

  return (
    <GlassCard>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: theme.accent }]} />
        <View style={styles.copy}>
          <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
        </View>
      </View>
      <ProgressBar value={progress} />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  dot: {
    borderRadius: 999,
    height: 14,
    width: 14,
  },
  copy: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
});
