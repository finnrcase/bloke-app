import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Award, CheckCircle2, Lock, Trophy } from 'lucide-react-native';

import { AppCard } from '@/components/AppCard';
import { AppPressButton } from '@/components/AppPressButton';
import { AppScreen } from '@/components/AppScreen';
import { BadgePill } from '@/components/ui/BadgePill';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type WeeklyProgress = Database['public']['Tables']['weekly_progress']['Row'];
type UserBadge = Database['public']['Tables']['user_badges']['Row'];

type ProgressState = {
  badges: UserBadge[];
  progressRows: WeeklyProgress[];
};

const badgeLabels = ['Consistency', 'Integrity', 'Discipline', 'Brotherhood', 'Leadership', 'Builder'];

function isWeekComplete(progress: WeeklyProgress) {
  return Boolean(progress.learn_complete && progress.act_complete && progress.log_complete);
}

function getCurrentWeek(progressRows: WeeklyProgress[]) {
  const completedWeeks = new Set(progressRows.filter(isWeekComplete).map((progress) => progress.week_number));
  let week = 1;

  while (completedWeeks.has(week)) {
    week += 1;
  }

  return week;
}

function getStreak(progressRows: WeeklyProgress[]) {
  const completedWeeks = progressRows
    .filter(isWeekComplete)
    .map((progress) => progress.week_number)
    .filter((week): week is number => typeof week === 'number');
  const completedSet = new Set(completedWeeks);
  let streak = 0;

  for (let week = Math.max(0, ...completedWeeks); week > 0; week -= 1) {
    if (!completedSet.has(week)) break;
    streak += 1;
  }

  return streak;
}

function formatDate(value: string | null) {
  if (!value) {
    return 'No submission yet';
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

export default function ProgressScreen() {
  const { session } = useAuth();
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [state, setState] = useState<ProgressState>({
    badges: [],
    progressRows: [],
  });

  const completedRows = useMemo(() => state.progressRows.filter(isWeekComplete), [state.progressRows]);
  const journeyProgress = Math.min(completedRows.length / 10, 1);
  const latestSubmittedAt = useMemo(
    () =>
      state.progressRows
        .map((progress) => progress.submitted_at)
        .filter((value): value is string => Boolean(value))
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null,
    [state.progressRows],
  );

  const loadProgress = useCallback(async () => {
    if (!supabase || !session) {
      setIsLoading(false);
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const [progressResult, badgesResult] = await Promise.all([
        supabase
          .from('weekly_progress')
          .select('*')
          .eq('profile_id', session.user.id)
          .order('week_number', { ascending: true }),
        supabase
          .from('user_badges')
          .select('*')
          .eq('profile_id', session.user.id)
          .order('earned_at', { ascending: false }),
      ]);

      if (progressResult.error) throw progressResult.error;
      if (badgesResult.error) throw badgesResult.error;

      setState({
        badges: badgesResult.data ?? [],
        progressRows: progressResult.data ?? [],
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load progress.');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  return (
    <AppScreen contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <Text style={styles.heading}>Progress</Text>
        <Text style={styles.subheading}>Clear signals. Steady work.</Text>
      </View>

      {isLoading ? (
        <AppCard>
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.black} />
            <Text style={styles.loadingText}>Loading progress...</Text>
          </View>
        </AppCard>
      ) : null}

      {errorMessage ? (
        <AppCard>
          <Text style={styles.error}>{errorMessage}</Text>
          <View style={styles.cardAction}>
            <AppPressButton label="Try again" onPress={loadProgress} variant="secondary" />
          </View>
        </AppCard>
      ) : null}

      {!isLoading && !errorMessage ? (
        <>
          <AppCard tone="dark" style={styles.journeyCard}>
            <Text style={styles.darkEyebrow}>Journey progress</Text>
            <Text style={styles.darkTitle}>{completedRows.length} weeks complete</Text>
            <ProgressBar label="Weeks 1-10" value={journeyProgress} />
          </AppCard>

          <View style={styles.metricsGrid}>
            <Metric label="Current week" value={`${getCurrentWeek(state.progressRows)}`} />
            <Metric label="Completed weeks" value={`${completedRows.length}`} />
            <Metric label="Weekly streak" value={`${getStreak(state.progressRows)}`} />
            <Metric label="Badges earned" value={`${state.badges.length}`} />
          </View>

          <AppCard>
            <SectionHeader icon={Trophy} title="Latest submission" />
            <Text style={styles.body}>{formatDate(latestSubmittedAt)}</Text>
          </AppCard>

          {state.progressRows.length === 0 ? (
            <AppCard>
              <EmptyState
                body="Start Week 1 in Curriculum. Mark Learn, Act, and Log to build your first streak."
                icon={Award}
                title="No progress yet."
              />
            </AppCard>
          ) : (
            <AppCard>
              <SectionHeader icon={CheckCircle2} title="Milestone timeline" />
              <View style={styles.weekList}>
                {state.progressRows.map((progress) => (
                  <View key={progress.id} style={styles.weekRow}>
                    <Text style={styles.weekTitle}>Week {progress.week_number}</Text>
                    <Text style={styles.weekStatus}>
                      {isWeekComplete(progress) ? 'Complete' : 'In progress'}
                    </Text>
                  </View>
                ))}
              </View>
            </AppCard>
          )}

          <AppCard>
            <SectionHeader icon={Award} title="Badges" subtitle="Earned badges stay bold. Locked badges stay quiet." />
            <View style={styles.badgeGrid}>
              {badgeLabels.map((label, index) => (
                <BadgePill
                  key={label}
                  icon={index < state.badges.length ? Award : Lock}
                  label={label}
                  locked={index >= state.badges.length}
                />
              ))}
            </View>
          </AppCard>
        </>
      ) : null}
    </AppScreen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    justifyContent: 'flex-start',
  },
  header: {
    gap: spacing.sm,
  },
  heading: {
    color: colors.text,
    fontSize: typography.hero,
    fontWeight: '900',
    lineHeight: 54,
  },
  subheading: {
    color: colors.mutedText,
    fontSize: 18,
    fontWeight: '800',
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.mutedText,
    fontSize: 18,
    fontWeight: '700',
  },
  metricsGrid: {
    gap: spacing.md,
  },
  journeyCard: {
    gap: spacing.lg,
  },
  darkEyebrow: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  darkTitle: {
    color: colors.inverseText,
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 42,
  },
  metricCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  metricLabel: {
    color: colors.mutedText,
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  body: {
    color: colors.mutedText,
    fontSize: 19,
    lineHeight: 29,
    marginTop: spacing.md,
  },
  weekList: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  weekRow: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  weekTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
  },
  weekStatus: {
    color: colors.mutedText,
    fontSize: 16,
    fontWeight: '800',
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  cardAction: {
    marginTop: spacing.xl,
  },
  error: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
  },
});
