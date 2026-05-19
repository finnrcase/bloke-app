import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { BookOpen, CheckCircle2, ClipboardList, Dumbbell, Send } from 'lucide-react-native';

import { AppCard } from '@/components/AppCard';
import { AppPressButton } from '@/components/AppPressButton';
import { AppScreen } from '@/components/AppScreen';
import { FormTextInput } from '@/components/FormTextInput';
import { FloatingCTA } from '@/components/ui/FloatingCTA';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientCard } from '@/components/ui/GradientCard';
import { HeroSection } from '@/components/ui/HeroSection';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { usePreferences } from '@/context/PreferencesContext';
import { useTheme } from '@/hooks/useTheme';
import { demoCurriculumWeeks, demoProgress, demoUserId } from '@/lib/demoData';
import { supabase } from '@/lib/supabase';
import { Database, Json } from '@/types/database';

type CurriculumWeek = Database['public']['Tables']['curriculum_weeks']['Row'];
type WeeklyProgress = Database['public']['Tables']['weekly_progress']['Row'];

type CurriculumState = {
  currentProgress: WeeklyProgress | null;
  currentWeek: CurriculumWeek | null;
  progressRows: WeeklyProgress[];
  weeks: CurriculumWeek[];
};

function isWeekComplete(progress?: WeeklyProgress | null) {
  return Boolean(progress?.learn_complete && progress.act_complete && progress.log_complete);
}

function getPrompts(value: Json | null) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((prompt): prompt is string => typeof prompt === 'string');
}

function buildAnswers(prompts: string[], answersByPrompt: Record<string, string>) {
  return prompts.map((prompt) => ({
    answer: answersByPrompt[prompt]?.trim() ?? '',
    prompt,
  }));
}

export default function CurriculumScreen() {
  const { isDemoMode, session } = useAuth();
  const { t } = usePreferences();
  const theme = useTheme();
  const [answersByPrompt, setAnswersByPrompt] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [state, setState] = useState<CurriculumState>({
    currentProgress: null,
    currentWeek: null,
    progressRows: [],
    weeks: [],
  });

  const prompts = useMemo(() => getPrompts(state.currentWeek?.log_prompts ?? null), [state.currentWeek]);

  const loadCurriculum = useCallback(async () => {
    if (isDemoMode && session) {
      const progressByWeek = new Map(demoProgress.map((progress) => [progress.week_number, progress]));
      const currentWeek =
        demoCurriculumWeeks.find((week) => !isWeekComplete(progressByWeek.get(week.week_number))) ??
        demoCurriculumWeeks[0] ??
        null;

      setAnswersByPrompt({});
      setState({
        currentProgress: currentWeek ? progressByWeek.get(currentWeek.week_number) ?? null : null,
        currentWeek,
        progressRows: demoProgress,
        weeks: demoCurriculumWeeks,
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
      const [weeksResult, progressResult] = await Promise.all([
        supabase.from('curriculum_weeks').select('*').order('week_number', { ascending: true }),
        supabase
          .from('weekly_progress')
          .select('*')
          .eq('profile_id', session.user.id)
          .order('week_number', { ascending: true }),
      ]);

      if (weeksResult.error) throw weeksResult.error;
      if (progressResult.error) throw progressResult.error;

      const weeks = weeksResult.data ?? [];
      const progressRows = progressResult.data ?? [];
      const progressByWeek = new Map(progressRows.map((progress) => [progress.week_number, progress]));
      const currentWeek =
        weeks.find((week) => !isWeekComplete(progressByWeek.get(week.week_number))) ?? weeks[0] ?? null;
      const currentProgress = currentWeek ? progressByWeek.get(currentWeek.week_number) ?? null : null;

      setAnswersByPrompt({});
      setState({
        currentProgress,
        currentWeek,
        progressRows,
        weeks,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load curriculum.');
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode, session]);

  useEffect(() => {
    loadCurriculum();
  }, [loadCurriculum]);

  async function saveProgress(update: Partial<WeeklyProgress>) {
    if (isDemoMode && session && state.currentWeek) {
      setErrorMessage('');
      setSavedMessage('');
      setIsSaving(true);

      const nextProgress: WeeklyProgress = {
        act_complete: state.currentProgress?.act_complete ?? false,
        created_at: state.currentProgress?.created_at ?? new Date().toISOString(),
        id: state.currentProgress?.id ?? `demo-progress-${state.currentWeek.week_number}`,
        learn_complete: state.currentProgress?.learn_complete ?? false,
        log_complete: state.currentProgress?.log_complete ?? false,
        profile_id: demoUserId,
        submitted_at: state.currentProgress?.submitted_at ?? null,
        week_number: state.currentWeek.week_number,
        ...update,
      };

      setState((current) => ({
        ...current,
        currentProgress: nextProgress,
        progressRows: [
          ...current.progressRows.filter((progress) => progress.week_number !== nextProgress.week_number),
          nextProgress,
        ].sort((a, b) => (a.week_number ?? 0) - (b.week_number ?? 0)),
      }));
      setSavedMessage('Saved in demo mode.');
      setIsSaving(false);
      return;
    }

    if (!supabase || !session || !state.currentWeek) {
      return;
    }

    setErrorMessage('');
    setSavedMessage('');
    setIsSaving(true);

    try {
      const nextProgress = {
        act_complete: state.currentProgress?.act_complete ?? false,
        learn_complete: state.currentProgress?.learn_complete ?? false,
        log_complete: state.currentProgress?.log_complete ?? false,
        profile_id: session.user.id,
        week_number: state.currentWeek.week_number,
        ...update,
      };

      const { data, error } = await supabase
        .from('weekly_progress')
        .upsert(nextProgress, { onConflict: 'profile_id,week_number' })
        .select('*')
        .single();

      if (error) throw error;

      setState((current) => ({
        ...current,
        currentProgress: data,
        progressRows: [
          ...current.progressRows.filter((progress) => progress.week_number !== data.week_number),
          data,
        ].sort((a, b) => (a.week_number ?? 0) - (b.week_number ?? 0)),
      }));
      setSavedMessage('Saved.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save progress.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmitWeek() {
    if (isDemoMode && session && state.currentWeek) {
      const answers = buildAnswers(prompts, answersByPrompt);
      const hasEmptyAnswer = prompts.length === 0 || answers.some((answer) => !answer.answer);

      if (hasEmptyAnswer) {
        setErrorMessage('Answer every log prompt before submitting.');
        return;
      }

      setErrorMessage('');
      setSavedMessage('');
      setIsSaving(true);

      const completeProgress: WeeklyProgress = {
        act_complete: true,
        created_at: state.currentProgress?.created_at ?? new Date().toISOString(),
        id: state.currentProgress?.id ?? `demo-progress-${state.currentWeek.week_number}`,
        learn_complete: true,
        log_complete: true,
        profile_id: demoUserId,
        submitted_at: new Date().toISOString(),
        week_number: state.currentWeek.week_number,
      };
      const nextProgressRows = [
        ...state.progressRows.filter((progress) => progress.week_number !== completeProgress.week_number),
        completeProgress,
      ].sort((a, b) => (a.week_number ?? 0) - (b.week_number ?? 0));
      const progressByWeek = new Map(nextProgressRows.map((progress) => [progress.week_number, progress]));
      const nextWeek =
        state.weeks.find((week) => !isWeekComplete(progressByWeek.get(week.week_number))) ??
        state.weeks[state.weeks.length - 1] ??
        null;

      setAnswersByPrompt({});
      setState({
        currentProgress: nextWeek ? progressByWeek.get(nextWeek.week_number) ?? null : null,
        currentWeek: nextWeek,
        progressRows: nextProgressRows,
        weeks: state.weeks,
      });
      setSavedMessage('Week submitted in demo mode.');
      setIsSaving(false);
      return;
    }

    if (!supabase || !session || !state.currentWeek) {
      return;
    }

    const answers = buildAnswers(prompts, answersByPrompt);
    const hasEmptyAnswer = prompts.length === 0 || answers.some((answer) => !answer.answer);

    if (hasEmptyAnswer) {
      setErrorMessage('Answer every log prompt before submitting.');
      return;
    }

    setErrorMessage('');
    setSavedMessage('');
    setIsSaving(true);

    try {
      const completeProgress = {
        act_complete: true,
        learn_complete: true,
        log_complete: true,
        profile_id: session.user.id,
        submitted_at: new Date().toISOString(),
        week_number: state.currentWeek.week_number,
      };

      const [progressResult, logResult] = await Promise.all([
        supabase
          .from('weekly_progress')
          .upsert(completeProgress, { onConflict: 'profile_id,week_number' })
          .select('*')
          .single(),
        supabase.from('journal_logs').upsert(
          {
            answers: answers as Json,
            profile_id: session.user.id,
            week_number: state.currentWeek.week_number,
          },
          { onConflict: 'profile_id,week_number' },
        ),
      ]);

      if (progressResult.error) throw progressResult.error;
      if (logResult.error) throw logResult.error;

      const nextProgressRows = [
        ...state.progressRows.filter(
          (progress) => progress.week_number !== progressResult.data.week_number,
        ),
        progressResult.data,
      ].sort((a, b) => (a.week_number ?? 0) - (b.week_number ?? 0));

      // Badges are awarded server-side by the weekly_progress trigger.
      const progressByWeek = new Map(nextProgressRows.map((progress) => [progress.week_number, progress]));
      const nextWeek =
        state.weeks.find((week) => !isWeekComplete(progressByWeek.get(week.week_number))) ??
        state.weeks[state.weeks.length - 1] ??
        null;

      setAnswersByPrompt({});
      setState({
        currentProgress: nextWeek ? progressByWeek.get(nextWeek.week_number) ?? null : null,
        currentWeek: nextWeek,
        progressRows: nextProgressRows,
        weeks: state.weeks,
      });
      setSavedMessage('Week submitted. Keep going.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not submit week.');
    } finally {
      setIsSaving(false);
    }
  }

  const currentWeek = state.currentWeek;
  const currentProgress = state.currentProgress;
  const logReady =
    prompts.length > 0 && buildAnswers(prompts, answersByPrompt).every((answer) => Boolean(answer.answer));
  const canSubmit = Boolean(currentProgress?.learn_complete && currentProgress.act_complete && logReady);

  return (
    <AppScreen contentStyle={styles.screenContent}>
      <HeroSection
        eyebrow="Focused work"
        icon={BookOpen}
        subtitle="One week. One standard. One proof point."
        title={t('curriculum')}
      />

      {isLoading ? (
        <AppCard>
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading curriculum...</Text>
          </View>
        </AppCard>
      ) : null}

      {errorMessage ? (
        <AppCard>
          <Text style={[styles.error, { color: theme.error }]}>{errorMessage}</Text>
          <View style={styles.cardAction}>
            <AppPressButton label={t('tryAgain')} onPress={loadCurriculum} variant="secondary" />
          </View>
        </AppCard>
      ) : null}

      {!isLoading && currentWeek ? (
        <>
          <GradientCard glow variant="dark">
            <View style={styles.weekHeroTop}>
              <Text style={[styles.darkEyebrow, { color: theme.accent }]}>Week {currentWeek.week_number}</Text>
              <Text style={[styles.darkEyebrow, { color: theme.accent }]}>
                {[currentProgress?.learn_complete, currentProgress?.act_complete, currentProgress?.log_complete].filter(Boolean).length} / 3
              </Text>
            </View>
            <Text style={[styles.darkTitle, { color: theme.textInverse }]}>{currentWeek.title}</Text>
            <Text style={[styles.identity, { color: theme.textInverse }]}>{currentWeek.identity_statement}</Text>
            <ProgressBar
              tone="inverse"
              value={
                [currentProgress?.learn_complete, currentProgress?.act_complete, currentProgress?.log_complete].filter(Boolean).length /
                3
              }
            />
          </GradientCard>

          <GlassCard>
            <StepHeader complete={currentProgress?.learn_complete} icon={BookOpen} label="Learn" />
            <Text style={[styles.sectionText, { color: theme.textSecondary }]}>{currentWeek.learn_text}</Text>
            <View style={styles.cardAction}>
              <AppPressButton
                disabled={isSaving || currentProgress?.learn_complete === true}
                icon={CheckCircle2}
                label={currentProgress?.learn_complete ? 'Learn Complete' : 'Mark Learn Complete'}
                onPress={() => saveProgress({ learn_complete: true })}
                variant={currentProgress?.learn_complete ? 'secondary' : 'primary'}
              />
            </View>
          </GlassCard>

          <GlassCard>
            <StepHeader complete={currentProgress?.act_complete} icon={Dumbbell} label="Act" />
            <Text style={[styles.sectionText, { color: theme.textSecondary }]}>{currentWeek.act_text}</Text>
            <View style={styles.cardAction}>
              <AppPressButton
                disabled={isSaving || currentProgress?.act_complete === true}
                icon={CheckCircle2}
                label={currentProgress?.act_complete ? 'Act Complete' : 'Mark Act Complete'}
                onPress={() => saveProgress({ act_complete: true })}
                variant={currentProgress?.act_complete ? 'secondary' : 'primary'}
              />
            </View>
          </GlassCard>

          <GlassCard>
            <StepHeader complete={currentProgress?.log_complete} icon={ClipboardList} label="Log" />
            <View style={styles.prompts}>
              {prompts.map((prompt, index) => (
                <FormTextInput
                  key={prompt}
                  label={`${index + 1}. ${prompt}`}
                  multiline
                  onChangeText={(answer) =>
                    setAnswersByPrompt((current) => ({ ...current, [prompt]: answer }))
                  }
                  placeholder="Write a clear answer."
                  style={styles.logInput}
                  textAlignVertical="top"
                  value={answersByPrompt[prompt] ?? ''}
                />
              ))}
            </View>
          </GlassCard>

          {savedMessage ? <Text style={[styles.saved, { color: theme.success }]}>{savedMessage}</Text> : null}

          {canSubmit ? (
            <FloatingCTA
              disabled={isSaving}
              icon={Send}
              label={isSaving ? 'Saving...' : 'Submit Week'}
              onPress={handleSubmitWeek}
            />
          ) : (
            <AppCard muted>
              <Text style={[styles.body, { color: theme.textSecondary }]}>
                Complete Learn, complete Act, and answer every Log prompt to submit.
              </Text>
            </AppCard>
          )}
        </>
      ) : null}

      {!isLoading && !currentWeek && !errorMessage ? (
        <AppCard>
          <Text style={[styles.title, { color: theme.textPrimary }]}>No week found.</Text>
          <Text style={[styles.sectionText, { color: theme.textSecondary }]}>Seed the curriculum to begin.</Text>
        </AppCard>
      ) : null}
    </AppScreen>
  );
}

function StepHeader({
  complete,
  icon,
  label,
}: {
  complete?: boolean | null;
  icon: Parameters<typeof SectionHeader>[0]['icon'];
  label: string;
}) {
  const theme = useTheme();

  return (
    <View style={styles.sectionHeader}>
      <SectionHeader icon={icon} title={label} />
      <View
        style={[
          styles.statusPill,
          {
            backgroundColor: complete ? theme.successSurface : theme.cardMuted,
            borderColor: complete ? theme.successBorder : theme.border,
          },
        ]}>
        <Text style={[styles.statusText, { color: complete ? theme.success : theme.textPrimary }]}>
          {complete ? 'Saved' : 'Open'}
        </Text>
      </View>
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
    lineHeight: 37,
    marginTop: spacing.md,
  },
  darkEyebrow: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  darkTitle: {
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 48,
  },
  weekHeroTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusPill: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '900',
  },
  sectionText: {
    fontSize: 20,
    lineHeight: 31,
    marginTop: spacing.lg,
  },
  body: {
    fontSize: 18,
    lineHeight: 28,
  },
  cardAction: {
    marginTop: spacing.xl,
  },
  prompts: {
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  logInput: {
    minHeight: 120,
  },
  error: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
  },
  saved: {
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
});
