import { router } from 'expo-router';
import { Award, Flame, Handshake, ShieldCheck, Target, TrendingUp } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { AppPressButton } from '@/components/AppPressButton';
import { AppScreen } from '@/components/AppScreen';
import { FloatingCTA } from '@/components/ui/FloatingCTA';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCard } from '@/components/ui/GradientCard';
import { HeroSection } from '@/components/ui/HeroSection';
import { MilestoneCard } from '@/components/ui/MilestoneCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { StreakCard } from '@/components/ui/StreakCard';
import { radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { usePreferences } from '@/context/PreferencesContext';
import { useTheme } from '@/hooks/useTheme';
import {
  demoAttendance,
  demoCurriculumWeeks,
  demoProgress,
  demoProfile,
} from '@/lib/demoData';
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
  const { isDemoMode, profile: cachedProfile, session } = useAuth();
  const { t } = usePreferences();
  const theme = useTheme();
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
    if (isDemoMode && session) {
      const progressByWeek = new Map(demoProgress.map((progress) => [progress.week_number, progress]));
      const currentWeek =
        demoCurriculumWeeks.find((week) => !isWeekComplete(progressByWeek.get(week.week_number))) ??
        demoCurriculumWeeks[0] ??
        null;

      setHomeState({
        chapterStreak: computeChapterStreak(demoAttendance),
        currentProgress: currentWeek ? progressByWeek.get(currentWeek.week_number) ?? null : null,
        currentWeek,
        profile: cachedProfile ?? demoProfile,
        weeklyStreak: computeWeeklyStreak(demoProgress),
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
  }, [cachedProfile, isDemoMode, session]);

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
      <HeroSection
        eyebrow="Today's standard"
        icon={ShieldCheck}
        subtitle="Every small promise kept becomes proof."
        title={`Rise, ${firstName}.`}
      />

      {isLoading ? (
        <AppCard>
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{t('loadingWeek')}</Text>
          </View>
        </AppCard>
      ) : null}

      {errorMessage ? (
        <AppCard>
          <Text style={[styles.error, { color: theme.error }]}>{errorMessage}</Text>
          <View style={styles.cardAction}>
            <AppPressButton label={t('tryAgain')} onPress={loadHome} variant="secondary" />
          </View>
        </AppCard>
      ) : null}

      {!isLoading && !errorMessage && currentWeek ? (
        <>
          <GradientCard glow style={styles.identityCard} variant="bronze">
            <View style={styles.heroTopRow}>
              <View style={styles.weekChip}>
                <Text style={[styles.weekChipText, { color: theme.accent }]}>Week {currentWeek.week_number}</Text>
              </View>
              <ProgressRing label="Week" value={completedParts / 3} />
            </View>
            <View>
              <Text style={[styles.darkTitle, { color: theme.textInverse }]}>{currentWeek.title}</Text>
              <Text style={[styles.identity, { color: theme.textInverse }]}>{currentWeek.identity_statement}</Text>
            </View>
            <View style={styles.stepRow}>
              <CompletionDot complete={currentProgress?.learn_complete} label="Learn" />
              <CompletionDot complete={currentProgress?.act_complete} label="Act" />
              <CompletionDot complete={currentProgress?.log_complete} label="Log" />
            </View>
            <FloatingCTA icon={Target} label="Continue Week" onPress={() => router.push('/curriculum')} />
          </GradientCard>

          <View style={styles.statsGrid}>
            <StreakCard icon={Flame} label="Weekly streak" value={`${homeState.weeklyStreak}`} />
            {homeState.chapterStreak !== null ? (
              <StreakCard icon={Handshake} label="Chapter streak" value={`${homeState.chapterStreak}`} />
            ) : null}
          </View>

          <MilestoneCard
            label="Next milestone"
            progress={Math.min((currentWeek.week_number - 1 + completedParts / 3) / 52, 1)}
            title={currentWeek.milestone_name ?? 'Keep going'}
          />

          <GlassCard>
            <View style={styles.actionHeader}>
              <TrendingUp color={theme.accent} size={22} strokeWidth={2.7} />
              <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>This week's action</Text>
            </View>
            <Text style={[styles.actionText, { color: theme.textSecondary }]}>{currentWeek.act_text}</Text>
          </GlassCard>
        </>
      ) : null}

      {!isLoading && !errorMessage && !currentWeek ? (
        <AppCard>
          <Text style={[styles.title, { color: theme.textPrimary }]}>No curriculum yet.</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>Seed the 52-week program to start the participant path.</Text>
        </AppCard>
      ) : null}
    </AppScreen>
  );
}

function CompletionDot({ complete, label }: { complete?: boolean | null; label: string }) {
  const theme = useTheme();

  return (
    <View style={styles.step}>
      <View
        style={[
          styles.stepDot,
          {
            backgroundColor: complete ? theme.accent : 'rgba(255, 249, 239, 0.2)',
            borderColor: complete ? theme.accent : 'rgba(255, 249, 239, 0.28)',
          },
        ]}
      />
      <Text style={[styles.stepText, { color: theme.textInverseMuted }]}>{label}</Text>
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
  eyebrow: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 42,
  },
  identity: {
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
    marginTop: spacing.sm,
  },
  identityCard: {
    gap: spacing.xl,
  },
  heroTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  darkTitle: {
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 48,
  },
  weekChip: {
    backgroundColor: 'rgba(255, 249, 239, 0.12)',
    borderColor: 'rgba(255, 249, 239, 0.22)',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  weekChipText: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  step: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  stepDot: {
    backgroundColor: 'rgba(255, 249, 239, 0.2)',
    borderColor: 'rgba(255, 249, 239, 0.28)',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 14,
    width: '100%',
  },
  stepText: {
    fontSize: 15,
    fontWeight: '900',
  },
  cardAction: {
    marginTop: spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  actionText: {
    fontSize: 19,
    lineHeight: 29,
    marginTop: spacing.md,
  },
  body: {
    fontSize: 18,
    lineHeight: 28,
    marginTop: spacing.md,
  },
  error: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
  },
});
