import { router } from 'expo-router';
import { ComponentType } from 'react';
import { Award, Flame, Handshake, Target, TrendingUp } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { AppPressButton } from '@/components/AppPressButton';
import { AppScreen } from '@/components/AppScreen';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type CurriculumWeek = Database['public']['Tables']['curriculum_weeks']['Row'];
type WeeklyProgress = Database['public']['Tables']['weekly_progress']['Row'];
type ChapterMember = Database['public']['Tables']['chapter_members']['Row'];
type Attendance = Database['public']['Tables']['attendance']['Row'];

type HomeState = {
  chapterStreak: number | null;
  currentProgress: WeeklyProgress | null;
  currentWeek: CurriculumWeek | null;
  profile: Profile | null;
  weeklyStreak: number;
};

function getFirstName(profile: Profile | null, fallbackEmail?: string) {
  const name = profile?.full_name?.trim();

  if (name) {
    return name.split(/\s+/)[0];
  }

  return fallbackEmail?.split('@')[0] ?? 'there';
}

function isWeekComplete(progress?: WeeklyProgress | null) {
  return Boolean(progress?.learn_complete && progress.act_complete && progress.log_complete);
}

function computeWeeklyStreak(progressRows: WeeklyProgress[]) {
  return progressRows
    .filter(isWeekComplete)
    .sort((a, b) => (a.week_number ?? 0) - (b.week_number ?? 0))
    .reduce((streak, progress) => {
      if (progress.week_number === streak + 1) {
        return streak + 1;
      }

      return streak;
    }, 0);
}

function getWeekKey(dateValue: string) {
  const date = new Date(dateValue);
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDays = Math.floor((date.getTime() - firstDayOfYear.getTime()) / 86400000);
  const weekNumber = Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7);

  return `${date.getFullYear()}-${weekNumber}`;
}

function computeChapterStreak(attendanceRows: Attendance[]) {
  const weekKeys = new Set(
    attendanceRows
      .map((attendance) => attendance.attended_at)
      .filter((attendedAt): attendedAt is string => Boolean(attendedAt))
      .map(getWeekKey),
  );

  return weekKeys.size;
}

export default function HomeScreen() {
  const { profile: cachedProfile, session } = useAuth();
  const [errorMessage, setErrorMessage] = useState('');
  const [homeState, setHomeState] = useState<HomeState>({
    chapterStreak: null,
    currentProgress: null,
    currentWeek: null,
    profile: cachedProfile,
    weeklyStreak: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadHome = useCallback(async () => {
    if (!supabase || !session) {
      setIsLoading(false);
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const [profileResult, weeksResult, progressResult, membershipResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
        supabase.from('curriculum_weeks').select('*').order('week_number', { ascending: true }),
        supabase
          .from('weekly_progress')
          .select('*')
          .eq('profile_id', session.user.id)
          .order('week_number', { ascending: true }),
        supabase.from('chapter_members').select('*').eq('profile_id', session.user.id).limit(1),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (weeksResult.error) throw weeksResult.error;
      if (progressResult.error) throw progressResult.error;
      if (membershipResult.error) throw membershipResult.error;

      const weeks = weeksResult.data ?? [];
      const progressRows = progressResult.data ?? [];
      const progressByWeek = new Map(progressRows.map((progress) => [progress.week_number, progress]));
      const currentWeek =
        weeks.find((week) => !isWeekComplete(progressByWeek.get(week.week_number))) ?? weeks[0] ?? null;
      const currentProgress = currentWeek ? progressByWeek.get(currentWeek.week_number) ?? null : null;
      const membership = (membershipResult.data?.[0] ?? null) as ChapterMember | null;
      let chapterStreak: number | null = null;

      if (membership?.chapter_id) {
        const attendanceResult = await supabase
          .from('attendance')
          .select('*')
          .eq('profile_id', session.user.id)
          .eq('chapter_id', membership.chapter_id)
          .order('attended_at', { ascending: false });

        if (attendanceResult.error) throw attendanceResult.error;

        chapterStreak = computeChapterStreak(attendanceResult.data ?? []);
      }

      setHomeState({
        chapterStreak,
        currentProgress,
        currentWeek,
        profile: profileResult.data ?? cachedProfile,
        weeklyStreak: computeWeeklyStreak(progressRows),
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load your home screen.');
    } finally {
      setIsLoading(false);
    }
  }, [cachedProfile, session]);

  useEffect(() => {
    loadHome();
  }, [loadHome]);

  const firstName = getFirstName(homeState.profile, session?.user.email);
  const currentWeek = homeState.currentWeek;
  const currentProgress = homeState.currentProgress;
  const completedParts = [
    currentProgress?.learn_complete,
    currentProgress?.act_complete,
    currentProgress?.log_complete,
  ].filter(Boolean).length;

  return (
    <AppScreen contentStyle={styles.screenContent}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {firstName}.</Text>
        <Text style={styles.subheading}>Keep moving. Keep it simple.</Text>
      </View>

      {isLoading ? (
        <AppCard>
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.black} />
            <Text style={styles.loadingText}>Loading your week...</Text>
          </View>
        </AppCard>
      ) : null}

      {errorMessage ? (
        <AppCard>
          <Text style={styles.error}>{errorMessage}</Text>
          <View style={styles.cardAction}>
            <AppPressButton label="Try again" onPress={loadHome} variant="secondary" />
          </View>
        </AppCard>
      ) : null}

      {!isLoading && !errorMessage && currentWeek ? (
        <>
          <AppCard tone="dark" style={styles.commandCard}>
            <Text style={styles.darkEyebrow}>Week {currentWeek.week_number}</Text>
            <Text style={styles.darkTitle}>{currentWeek.title}</Text>
            <Text style={styles.identity}>{currentWeek.identity_statement}</Text>
            <ProgressBar label={`${completedParts} of 3 complete`} value={completedParts / 3} />

            <View style={styles.progressGrid}>
              <CompletionPill complete={currentProgress?.learn_complete} label="Learn" />
              <CompletionPill complete={currentProgress?.act_complete} label="Act" />
              <CompletionPill complete={currentProgress?.log_complete} label="Log" />
            </View>

            <View style={styles.cardAction}>
              <AppPressButton icon={Target} label="Continue Week" onPress={() => router.push('/curriculum')} />
            </View>
          </AppCard>

          <View style={styles.statsGrid}>
            <MetricCard icon={Flame} label="Weekly streak" value={`${homeState.weeklyStreak}`} />
            {homeState.chapterStreak !== null ? (
              <MetricCard icon={Handshake} label="Chapter streak" value={`${homeState.chapterStreak}`} />
            ) : null}
            <MetricCard icon={Award} label="Next badge" value={currentWeek.milestone_name ?? 'Keep going'} />
          </View>

          <AppCard tone="accent">
            <SectionHeader icon={TrendingUp} title="This week's action" />
            <Text style={styles.actionText}>{currentWeek.act_text}</Text>
          </AppCard>
        </>
      ) : null}

      {!isLoading && !errorMessage && !currentWeek ? (
        <AppCard>
          <Text style={styles.title}>No curriculum yet.</Text>
          <Text style={styles.body}>Seed Weeks 1-10 to start the participant path.</Text>
        </AppCard>
      ) : null}
    </AppScreen>
  );
}

function CompletionPill({ complete, label }: { complete?: boolean | null; label: string }) {
  return (
    <View style={[styles.pill, complete ? styles.pillComplete : styles.pillPending]}>
      <Text style={[styles.pillText, complete ? styles.pillTextComplete : styles.pillTextPending]}>
        {label}
      </Text>
      <Text style={[styles.pillState, complete ? styles.pillTextComplete : styles.pillTextPending]}>
        {complete ? 'Done' : 'Open'}
      </Text>
    </View>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Icon color={colors.gold} size={22} strokeWidth={2.5} />
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
  greeting: {
    color: colors.text,
    fontSize: typography.hero,
    fontWeight: '900',
    lineHeight: 54,
  },
  subheading: {
    color: colors.mutedText,
    fontSize: 18,
    fontWeight: '700',
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
  eyebrow: {
    color: colors.mutedText,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 42,
  },
  identity: {
    color: colors.inverseText,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 32,
    marginTop: spacing.md,
  },
  commandCard: {
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
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 44,
  },
  progressGrid: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  pill: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  pillComplete: {
    backgroundColor: 'rgba(176, 138, 69, 0.18)',
    borderColor: colors.gold,
  },
  pillPending: {
    backgroundColor: 'rgba(255, 252, 247, 0.08)',
    borderColor: 'rgba(255, 252, 247, 0.24)',
  },
  pillText: {
    fontSize: 17,
    fontWeight: '900',
  },
  pillState: {
    fontSize: 15,
    fontWeight: '800',
  },
  pillTextComplete: {
    color: colors.inverseText,
  },
  pillTextPending: {
    color: colors.inverseText,
  },
  cardAction: {
    marginTop: spacing.xl,
  },
  statsGrid: {
    gap: spacing.md,
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
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  actionText: {
    color: colors.mutedText,
    fontSize: 19,
    lineHeight: 29,
    marginTop: spacing.md,
  },
  body: {
    color: colors.mutedText,
    fontSize: 18,
    lineHeight: 28,
    marginTop: spacing.md,
  },
  error: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
  },
});
