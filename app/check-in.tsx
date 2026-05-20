import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, CheckCircle2, Dumbbell, Flame, Repeat2, Target } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppPressButton } from '@/components/AppPressButton';
import { FormTextInput } from '@/components/FormTextInput';
import { StreakSummary } from '@/components/progress/StreakSummary';
import { RouteGuard } from '@/components/RouteGuard';
import { radius, shadows, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import {
  getAccountabilityStreak,
  getAverageConsistency,
  getConsistencyScore,
  getWeekStart,
  WeeklyCheckIn,
} from '@/lib/accountability';
import { demoUserId } from '@/lib/demoData';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type WeeklyCheckInInsert = Database['public']['Tables']['weekly_checkins']['Insert'];

const demoCheckIns: WeeklyCheckIn[] = [
  {
    consistency_score: 86,
    created_at: new Date().toISOString(),
    habit_completed: 6,
    habit_name: 'No phone after 10',
    habit_target: 7,
    id: 'demo-checkin-1',
    profile_id: demoUserId,
    reflection: 'Better sleep. Need to protect Sunday night.',
    submitted_at: new Date().toISOString(),
    week_start: getWeekStart(),
    weekly_goal: 'Train three times and keep the evenings clean.',
    workout_completed: 3,
    workout_target: 3,
  },
];

export default function WeeklyCheckInScreen() {
  const theme = useTheme();
  const { isDemoMode, session } = useAuth();
  const [checkIns, setCheckIns] = useState<WeeklyCheckIn[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [habitCompleted, setHabitCompleted] = useState('0');
  const [habitName, setHabitName] = useState('');
  const [habitTarget, setHabitTarget] = useState('7');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [reflection, setReflection] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [weeklyGoal, setWeeklyGoal] = useState('');
  const [workoutCompleted, setWorkoutCompleted] = useState('0');
  const [workoutTarget, setWorkoutTarget] = useState('3');
  const weekStart = getWeekStart();

  const currentCheckIn = useMemo(
    () => checkIns.find((checkIn) => checkIn.week_start === weekStart) ?? null,
    [checkIns, weekStart],
  );
  const consistency = getAverageConsistency(checkIns);
  const streak = getAccountabilityStreak(checkIns);

  const loadCheckIns = useCallback(async () => {
    if (isDemoMode && session) {
      hydrateForm(demoCheckIns[0]);
      setCheckIns(demoCheckIns);
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
      const { data, error } = await supabase
        .from('weekly_checkins')
        .select('*')
        .eq('profile_id', session.user.id)
        .order('week_start', { ascending: false });

      if (error) throw error;

      const rows = data ?? [];
      setCheckIns(rows);
      hydrateForm(rows.find((row) => row.week_start === weekStart) ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load weekly check-ins.');
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode, session, weekStart]);

  useEffect(() => {
    loadCheckIns();
  }, [loadCheckIns]);

  function hydrateForm(checkIn: WeeklyCheckIn | null) {
    setWeeklyGoal(checkIn?.weekly_goal ?? '');
    setWorkoutTarget(String(checkIn?.workout_target ?? 3));
    setWorkoutCompleted(String(checkIn?.workout_completed ?? 0));
    setHabitName(checkIn?.habit_name ?? '');
    setHabitTarget(String(checkIn?.habit_target ?? 7));
    setHabitCompleted(String(checkIn?.habit_completed ?? 0));
    setReflection(checkIn?.reflection ?? '');
  }

  async function submitCheckIn() {
    if (!session) return;

    const workoutTargetValue = parsePositiveInt(workoutTarget, 'workout target');
    const workoutCompletedValue = parseNonNegativeInt(workoutCompleted, 'completed workouts');
    const habitTargetValue = parsePositiveInt(habitTarget, 'habit target');
    const habitCompletedValue = parseNonNegativeInt(habitCompleted, 'habit completions');

    if (!weeklyGoal.trim()) {
      setErrorMessage('Set one clear weekly goal.');
      return;
    }

    if (!habitName.trim()) {
      setErrorMessage('Name the habit you are tracking.');
      return;
    }

    setErrorMessage('');
    setSavedMessage('');
    setIsSaving(true);

    const nextCheckIn: WeeklyCheckInInsert = {
      consistency_score: getConsistencyScore({
        habitCompleted: habitCompletedValue,
        habitTarget: habitTargetValue,
        workoutCompleted: workoutCompletedValue,
        workoutTarget: workoutTargetValue,
      }),
      habit_completed: habitCompletedValue,
      habit_name: habitName.trim(),
      habit_target: habitTargetValue,
      profile_id: session.user.id,
      reflection: reflection.trim() || null,
      submitted_at: new Date().toISOString(),
      week_start: weekStart,
      weekly_goal: weeklyGoal.trim(),
      workout_completed: workoutCompletedValue,
      workout_target: workoutTargetValue,
    };

    try {
      if (isDemoMode) {
        const row = { ...nextCheckIn, created_at: new Date().toISOString(), id: `demo-checkin-${Date.now()}` } as WeeklyCheckIn;
        setCheckIns((current) => [row, ...current.filter((checkIn) => checkIn.week_start !== weekStart)]);
        setSavedMessage('Weekly check-in submitted in demo mode.');
        return;
      }

      if (!supabase) throw new Error('Supabase is not configured. Add your Expo public Supabase env vars.');

      const { data, error } = await supabase
        .from('weekly_checkins')
        .upsert(nextCheckIn, { onConflict: 'profile_id,week_start' })
        .select('*')
        .single();

      if (error) throw error;

      setCheckIns((current) => [data, ...current.filter((checkIn) => checkIn.week_start !== data.week_start)]);
      setSavedMessage('Weekly check-in submitted.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not submit check-in.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <RouteGuard mode="protected">
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <LinearGradient
          colors={theme.name === 'dark' ? ['#070605', '#15110D', '#070605'] : ['#F6F1E8', '#EFE3D2', '#F6F1E8']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: theme.glass, borderColor: theme.border }]}>
            <ArrowLeft color={theme.textPrimary} size={22} strokeWidth={2.8} />
          </Pressable>
          <Text style={[styles.topTitle, { color: theme.textPrimary }]}>Weekly Check-In</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading your week...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <StreakSummary
              consistency={consistency}
              goal={currentCheckIn?.weekly_goal ?? weeklyGoal}
              streak={streak}
              submittedWeeks={checkIns.filter((checkIn) => Boolean(checkIn.submitted_at)).length}
            />

            <View style={[styles.formCard, { backgroundColor: theme.glass, borderColor: theme.border }, shadows.card]}>
              <Text style={[styles.eyebrow, { color: theme.accent }]}>This week</Text>
              <Text style={[styles.title, { color: theme.textPrimary }]}>Set the standard</Text>
              <View style={styles.form}>
                <FormTextInput
                  label="Weekly goal"
                  multiline
                  onChangeText={setWeeklyGoal}
                  placeholder="One clear outcome you will own this week"
                  style={styles.multiline}
                  textAlignVertical="top"
                  value={weeklyGoal}
                />
                <View style={styles.split}>
                  <FormTextInput inputMode="numeric" keyboardType="number-pad" label="Workout target" onChangeText={setWorkoutTarget} value={workoutTarget} />
                  <FormTextInput inputMode="numeric" keyboardType="number-pad" label="Workouts done" onChangeText={setWorkoutCompleted} value={workoutCompleted} />
                </View>
                <FormTextInput label="Habit" onChangeText={setHabitName} placeholder="No phone after 10, morning walk, reading..." value={habitName} />
                <View style={styles.split}>
                  <FormTextInput inputMode="numeric" keyboardType="number-pad" label="Habit target" onChangeText={setHabitTarget} value={habitTarget} />
                  <FormTextInput inputMode="numeric" keyboardType="number-pad" label="Habit done" onChangeText={setHabitCompleted} value={habitCompleted} />
                </View>
                <FormTextInput
                  label="Reflection"
                  multiline
                  onChangeText={setReflection}
                  placeholder="What helped? What needs tightening?"
                  style={styles.multiline}
                  textAlignVertical="top"
                  value={reflection}
                />
              </View>
              {errorMessage ? <Text style={[styles.error, { color: theme.error }]}>{errorMessage}</Text> : null}
              {savedMessage ? <Text style={[styles.saved, { color: theme.success }]}>{savedMessage}</Text> : null}
              <AppPressButton
                disabled={isSaving}
                icon={CheckCircle2}
                label={isSaving ? 'Submitting...' : 'Submit weekly check-in'}
                onPress={submitCheckIn}
                variant="accent"
              />
            </View>

            <View style={styles.quickStats}>
              <QuickStat icon={Dumbbell} label="Workout pace" value={`${workoutCompleted || 0}/${workoutTarget || 0}`} />
              <QuickStat icon={Repeat2} label="Habit pace" value={`${habitCompleted || 0}/${habitTarget || 0}`} />
              <QuickStat icon={Flame} label="This week" value={`${getConsistencyScore({
                habitCompleted: Number(habitCompleted) || 0,
                habitTarget: Number(habitTarget) || 1,
                workoutCompleted: Number(workoutCompleted) || 0,
                workoutTarget: Number(workoutTarget) || 1,
              })}%`} />
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </RouteGuard>
  );
}

function QuickStat({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.quickStat, { backgroundColor: theme.glass, borderColor: theme.border }]}>
      <Icon color={theme.accent} size={20} strokeWidth={2.7} />
      <Text style={[styles.quickLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.quickValue, { color: theme.textPrimary }]}>{value}</Text>
    </View>
  );
}

function parsePositiveInt(value: string, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`Enter a valid ${label}.`);
  return parsed;
}

function parseNonNegativeInt(value: string, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`Enter valid ${label}.`);
  return parsed;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  loadingWrap: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '900',
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.display,
  },
  formCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  form: {
    gap: spacing.md,
  },
  split: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  multiline: {
    minHeight: 104,
  },
  error: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
  },
  saved: {
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 22,
  },
  quickStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  quickStat: {
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: 3,
    minWidth: 120,
    padding: spacing.md,
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  quickValue: {
    fontSize: 22,
    fontWeight: '900',
  },
});
