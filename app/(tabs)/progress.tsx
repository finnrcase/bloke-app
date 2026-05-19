import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Award, CheckCircle2, Lock, Trophy } from 'lucide-react-native';

import { AppCard } from '@/components/AppCard';
import { AppPressButton } from '@/components/AppPressButton';
import { AppScreen } from '@/components/AppScreen';
import { BadgeCard } from '@/components/ui/BadgeCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCard } from '@/components/ui/GradientCard';
import { HeroSection } from '@/components/ui/HeroSection';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { usePreferences } from '@/context/PreferencesContext';
import { useTheme } from '@/hooks/useTheme';
import { demoProgress, demoUserBadges } from '@/lib/demoData';
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
  const { isDemoMode, session } = useAuth();
  const { t } = usePreferences();
  const theme = useTheme();
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
    if (isDemoMode && session) {
      setState({
        badges: demoUserBadges,
        progressRows: demoProgress,
      });
      setErrorMessage('');
      setIsLoading(false);
      return;
    }

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
  }, [isDemoMode, session]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  return (
    <AppScreen contentStyle={styles.screenContent}>
      <HeroSection
        eyebrow="Becoming visible"
        icon={Trophy}
        subtitle="Status here is earned through steady, honest work."
        title={t('progress')}
      />

      {isLoading ? (
        <AppCard>
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{t('loadingProgress')}</Text>
          </View>
        </AppCard>
      ) : null}

      {errorMessage ? (
        <AppCard>
          <Text style={[styles.error, { color: theme.error }]}>{errorMessage}</Text>
          <View style={styles.cardAction}>
            <AppPressButton label={t('tryAgain')} onPress={loadProgress} variant="secondary" />
          </View>
        </AppCard>
      ) : null}

      {!isLoading && !errorMessage ? (
        <>
          <GradientCard glow style={styles.journeyCard} variant="olive">
            <Text style={[styles.darkEyebrow, { color: theme.accent }]}>Journey progress</Text>
            <Text style={[styles.darkTitle, { color: theme.textInverse }]}>{completedRows.length} weeks complete</Text>
            <ProgressBar label="Weeks 1-10" tone="inverse" value={journeyProgress} />
          </GradientCard>

          <View style={styles.metricsGrid}>
            <Metric label="Current week" value={`${getCurrentWeek(state.progressRows)}`} />
            <Metric label="Completed weeks" value={`${completedRows.length}`} />
            <Metric label="Weekly streak" value={`${getStreak(state.progressRows)}`} />
            <Metric label="Badges earned" value={`${state.badges.length}`} />
          </View>

          <GlassCard>
            <SectionHeader icon={Trophy} title="Latest submission" />
            <Text style={[styles.body, { color: theme.textSecondary }]}>{formatDate(latestSubmittedAt)}</Text>
          </GlassCard>

          {state.progressRows.length === 0 ? (
            <AppCard>
              <EmptyState
                body="Start Week 1 in Curriculum. Mark Learn, Act, and Log to build your first streak."
                icon={Award}
                title="No progress yet."
              />
            </AppCard>
          ) : (
            <GlassCard>
              <SectionHeader icon={CheckCircle2} title="Milestone timeline" />
              <View style={styles.weekList}>
                {state.progressRows.map((progress) => (
                  <View
                    key={progress.id}
                    style={[styles.weekRow, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
                    <Text style={[styles.weekTitle, { color: theme.textPrimary }]}>Week {progress.week_number}</Text>
                    <Text style={[styles.weekStatus, { color: theme.textSecondary }]}>
                      {isWeekComplete(progress) ? 'Complete' : 'In progress'}
                    </Text>
                  </View>
                ))}
              </View>
            </GlassCard>
          )}

          <GlassCard>
            <SectionHeader icon={Award} title="Badges" subtitle="Earned badges stay bold. Locked badges stay quiet." />
            <View style={styles.badgeGrid}>
              {badgeLabels.map((label, index) => (
                <BadgeCard
                  key={label}
                  icon={index < state.badges.length ? Award : Lock}
                  subtitle={index < state.badges.length ? 'Earned' : 'Locked'}
                  title={label}
                  locked={index >= state.badges.length}
                />
              ))}
            </View>
          </GlassCard>
        </>
      ) : null}
    </AppScreen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.metricCard, { backgroundColor: theme.glass, borderColor: theme.border }]}>
      <Text style={[styles.metricLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: theme.textPrimary }]}>{value}</Text>
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
    fontSize: typography.hero,
    fontWeight: '900',
    lineHeight: 54,
  },
  subheading: {
    fontSize: 18,
    fontWeight: '800',
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  journeyCard: {
    gap: spacing.lg,
  },
  darkEyebrow: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  darkTitle: {
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 42,
  },
  metricCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    flex: 1,
    gap: spacing.sm,
    minWidth: 150,
    padding: spacing.lg,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '900',
  },
  body: {
    fontSize: 19,
    lineHeight: 29,
    marginTop: spacing.md,
  },
  weekList: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  weekRow: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  weekTitle: {
    fontSize: 19,
    fontWeight: '900',
  },
  weekStatus: {
    fontSize: 16,
    fontWeight: '800',
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cardAction: {
    marginTop: spacing.xl,
  },
  error: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
  },
});
