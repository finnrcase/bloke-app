import { Medal } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export type LeaderboardEntry = {
  consistency: number;
  name: string;
  profileId: string;
  rank: number;
  streak: number;
  submittedWeeks: number;
};

export function LeaderboardCard({ entries }: { entries: LeaderboardEntry[] }) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.glass, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: theme.cardInverted, borderColor: theme.accentBorder }]}>
          <Medal color={theme.accent} size={22} strokeWidth={2.8} />
        </View>
        <View>
          <Text style={[styles.eyebrow, { color: theme.accent }]}>Chapter leaderboard</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Consistency board</Text>
        </View>
      </View>
      {entries.length === 0 ? (
        <Text style={[styles.empty, { color: theme.textSecondary }]}>
          Submit a weekly check-in to appear on the board.
        </Text>
      ) : (
        <View style={styles.list}>
          {entries.map((entry) => (
            <View key={entry.profileId} style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.rank, { color: theme.accent }]}>#{entry.rank}</Text>
              <View style={styles.copy}>
                <Text style={[styles.name, { color: theme.textPrimary }]}>{entry.name}</Text>
                <Text style={[styles.meta, { color: theme.textSecondary }]}>
                  {entry.streak} week streak · {entry.submittedWeeks} submitted
                </Text>
              </View>
              <Text style={[styles.score, { color: theme.textPrimary }]}>{entry.consistency}%</Text>
            </View>
          ))}
        </View>
      )}
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
    gap: spacing.md,
  },
  icon: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
  },
  empty: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 23,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  rank: {
    fontSize: 16,
    fontWeight: '900',
    width: 38,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '900',
  },
  meta: {
    fontSize: 13,
    fontWeight: '800',
  },
  score: {
    fontSize: 20,
    fontWeight: '900',
  },
});
