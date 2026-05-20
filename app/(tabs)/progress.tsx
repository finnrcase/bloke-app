import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Award, CheckCircle2, Dumbbell, Flame, Plus, Repeat2, Trophy } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AppCard } from '@/components/AppCard';
import { AppButton } from '@/components/AppButton';
import { AppPressButton } from '@/components/AppPressButton';
import { AppScreen } from '@/components/AppScreen';
import { LeaderboardCard, LeaderboardEntry } from '@/components/progress/LeaderboardCard';
import { StreakSummary } from '@/components/progress/StreakSummary';
import { BadgeCard } from '@/components/ui/BadgeCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { HeroSection } from '@/components/ui/HeroSection';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { usePreferences } from '@/context/PreferencesContext';
import { useTheme } from '@/hooks/useTheme';
import {
  getAccountabilityStreak,
  getAverageConsistency,
  getWeekStart,
  WeeklyCheckIn,
} from '@/lib/accountability';
import { demoMemberProfiles, demoUserBadges, demoUserId } from '@/lib/demoData';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type UserBadge = Database['public']['Tables']['user_badges']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

type ProgressState = {
  badges: UserBadge[];
  checkIns: WeeklyCheckIn[];
  leaderboard: LeaderboardEntry[];
};

const demoCheckIns: WeeklyCheckIn[] = [
  {
    consistency_score: 86,
    created_at: new Date().toISOString(),
    habit_completed: 6,
    habit_name: 'No phone after 10',
    habit_target: 7,
    id: 'demo-checkin-current',
    profile_id: demoUserId,
    reflection: 'Sleep improved. Keep Sunday clean.',
    submitted_at: new Date().toISOString(),
    week_start: getWeekStart(),
    weekly_goal: 'Train three times and keep evenings clean.',
    workout_completed: 3,
    workout_target: 3,
  },
  {
    consistency_score: 78,
    created_at: new Date().toISOString(),
    habit_completed: 5,
    habit_name: 'Morning walk',
    habit_target: 7,
    id: 'demo-checkin-last',
    profile_id: demoUserId,
    reflection: 'Good week. Missed two habit days.',
    submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    week_start: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10),
    weekly_goal: 'Show up before excuses.',
    workout_completed: 3,
    workout_target: 4,
  },
];

export default function ProgressScreen() {
  const { isDemoMode, session } = useAuth();
  const { t } = usePreferences();
  const theme = useTheme();
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [state, setState] = useState<ProgressState>({
    badges: [],
    checkIns: [],
    leaderboard: [],
  });

  const currentCheckIn = useMemo(
    () => state.checkIns.find((checkIn) => checkIn.week_start === getWeekStart()) ?? null,
    [state.checkIns],
  );
  const submittedWeeks = state.checkIns.filter((checkIn) => Boolean(checkIn.submitted_at)).length;
  const streak = getAccountabilityStreak(state.checkIns);
  const consistency = getAverageConsistency(state.checkIns);

  const loadProgress = useCallback(async () => {
    if (isDemoMode && session) {
      setState({
        badges: demoUserBadges,
        checkIns: demoCheckIns,
        leaderboard: buildDemoLeaderboard(),
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
      const [checkInsResult, badgesResult] = await Promise.all([
        supabase
          .from('weekly_checkins')
          .select('*')
          .eq('profile_id', session.user.id)
          .order('week_start', { ascending: false }),
        supabase
          .from('user_badges')
          .select('*')
          .eq('profile_id', session.user.id)
          .order('earned_at', { ascending: false }),
      ]);

      if (checkInsResult.error) throw checkInsResult.error;
      if (badgesResult.error) throw badgesResult.error;

      const leaderboard = await loadLeaderboard(session.user.id);

      setState({
        badges: badgesResult.data ?? [],
        checkIns: checkInsResult.data ?? [],
        leaderboard,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load accountability progress.');
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
        eyebrow="Retention loop"
        icon={Trophy}
        subtitle="Goals, workouts, habits, and chapter consistency in one place."
        title={t('progress')}
      />

      {isLoading ? (
        <AppCard>
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading accountability...</Text>
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
          <StreakSummary
            consistency={consistency}
            goal={currentCheckIn?.weekly_goal ?? ''}
            streak={streak}
            submittedWeeks={submittedWeeks}
          />

          <View style={styles.cardAction}>
            <AppButton href="/check-in" icon={Plus} label="Weekly Check-In" variant="accent" />
          </View>

          <View style={styles.metricsGrid}>
            <Metric icon={Flame} label="Streak" value={`${streak}`} />
            <Metric icon={Dumbbell} label="Workouts" value={`${currentCheckIn?.workout_completed ?? 0}/${currentCheckIn?.workout_target ?? 3}`} />
            <Metric icon={Repeat2} label="Habit" value={`${currentCheckIn?.habit_completed ?? 0}/${currentCheckIn?.habit_target ?? 7}`} />
            <Metric icon={CheckCircle2} label="Consistency" value={`${consistency}%`} />
          </View>

          <GlassCard>
            <SectionHeader icon={Award} title="This week’s loop" subtitle="Keep the next action obvious." />
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              {currentCheckIn
                ? `${currentCheckIn.weekly_goal} Habit: ${currentCheckIn.habit_name}.`
                : 'Submit a weekly check-in to set your goal, track training, and start your streak.'}
            </Text>
            <ProgressBar label="Weekly consistency" value={consistency / 100} />
          </GlassCard>

          <LeaderboardCard entries={state.leaderboard} />

          <GlassCard>
            <SectionHeader icon={Award} title="Badges" subtitle="Streaks and consistency unlock identity markers." />
            <View style={styles.badgeGrid}>
              {['Consistency', 'Integrity', 'Discipline', 'Brotherhood'].map((label, index) => (
                <BadgeCard
                  icon={index < state.badges.length ? Award : Trophy}
                  key={label}
                  locked={index >= state.badges.length}
                  subtitle={index < state.badges.length ? 'Earned' : 'Locked'}
                  title={label}
                />
              ))}
            </View>
          </GlassCard>
        </>
      ) : null}
    </AppScreen>
  );
}

async function loadLeaderboard(userId: string): Promise<LeaderboardEntry[]> {
  if (!supabase) return [];

  const membershipResult = await supabase
    .from('chapter_members')
    .select('*')
    .eq('profile_id', userId)
    .eq('status', 'active')
    .limit(1);

  if (membershipResult.error || !membershipResult.data?.[0]?.chapter_id) return [];

  const membersResult = await supabase
    .from('chapter_members')
    .select('*')
    .eq('chapter_id', membershipResult.data[0].chapter_id)
    .eq('status', 'active');

  if (membersResult.error) return [];

  const profileIds = (membersResult.data ?? [])
    .map((member) => member.profile_id)
    .filter((id): id is string => Boolean(id));

  if (profileIds.length === 0) return [];

  const [profilesResult, checkInsResult] = await Promise.all([
    supabase.from('profiles').select('*').in('id', profileIds),
    supabase.from('weekly_checkins').select('*').in('profile_id', profileIds),
  ]);

  if (profilesResult.error || checkInsResult.error) return [];

  return buildLeaderboard(profilesResult.data ?? [], checkInsResult.data ?? []);
}

function buildDemoLeaderboard() {
  return [
    { consistency: 91, name: 'Marcus Reed', profileId: 'demo-2', rank: 1, streak: 4, submittedWeeks: 4 },
    { consistency: 86, name: 'Demo Leader', profileId: demoUserId, rank: 2, streak: 2, submittedWeeks: 2 },
    { consistency: 74, name: 'James Carter', profileId: 'demo-3', rank: 3, streak: 1, submittedWeeks: 3 },
  ];
}

function buildLeaderboard(profiles: Profile[], checkIns: WeeklyCheckIn[]) {
  return profiles
    .map((profile) => {
      const rows = checkIns.filter((checkIn) => checkIn.profile_id === profile.id);
      return {
        consistency: getAverageConsistency(rows),
        name: profile.full_name ?? profile.username ?? 'Unnamed member',
        profileId: profile.id,
        rank: 0,
        streak: getAccountabilityStreak(rows),
        submittedWeeks: rows.filter((row) => Boolean(row.submitted_at)).length,
      };
    })
    .filter((entry) => entry.submittedWeeks > 0)
    .sort((a, b) => b.consistency - a.consistency || b.streak - a.streak)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.metricCard, { backgroundColor: theme.glass, borderColor: theme.border }]}>
      <Icon color={theme.accent} size={22} strokeWidth={2.7} />
      <Text style={[styles.metricLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: theme.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    justifyContent: 'flex-start',
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
  metricCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    flex: 1,
    gap: spacing.sm,
    minWidth: 150,
    padding: spacing.lg,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  body: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 25,
    marginTop: spacing.md,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cardAction: {
    marginTop: spacing.sm,
  },
  error: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
  },
});
