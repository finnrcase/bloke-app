import { Flame, Percent, Target, Trophy } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ProgressBar } from '@/components/ui/ProgressBar';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type StreakSummaryProps = {
  consistency: number;
  goal: string;
  streak: number;
  submittedWeeks: number;
};

export function StreakSummary({ consistency, goal, streak, submittedWeeks }: StreakSummaryProps) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.cardInverted, borderColor: theme.accentBorder }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.accent }]}>Accountability streak</Text>
          <Text style={[styles.title, { color: theme.textInverse }]}>{streak} weeks locked</Text>
        </View>
        <View style={[styles.flame, { backgroundColor: theme.accent }]}>
          <Flame color={theme.accentText} size={24} strokeWidth={2.8} />
        </View>
      </View>
      <Text style={[styles.goal, { color: theme.textInverseMuted }]} numberOfLines={2}>
        {goal || 'Set this week’s goal to start the loop.'}
      </Text>
      <ProgressBar label="Consistency" tone="inverse" value={consistency / 100} />
      <View style={styles.metrics}>
        <MiniMetric icon={Percent} label="Consistency" value={`${consistency}%`} />
        <MiniMetric icon={Trophy} label="Submitted" value={`${submittedWeeks}`} />
        <MiniMetric icon={Target} label="Target" value="Weekly" />
      </View>
    </View>
  );
}

function MiniMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Percent;
  label: string;
  value: string;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.metric, { backgroundColor: theme.overlay, borderColor: theme.borderStrong }]}>
      <Icon color={theme.accent} size={16} strokeWidth={2.6} />
      <Text style={[styles.metricLabel, { color: theme.textInverseMuted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: theme.textInverse }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
  },
  flame: {
    alignItems: 'center',
    borderRadius: radius.lg,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  goal: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 23,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metric: {
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: 3,
    minWidth: 100,
    padding: spacing.md,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
  },
});
