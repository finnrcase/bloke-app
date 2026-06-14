import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  ClipboardList,
  Dumbbell,
  Lock,
  Send,
} from 'lucide-react-native';

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
import {
  demoCurriculumReflections,
  demoCurriculumWeeks,
  demoProgress,
  demoReflectionQuestions,
  demoUserId,
} from '@/lib/demoData';
import { supabase } from '@/lib/supabase';
import { Database, Json } from '@/types/database';

type CurriculumWeek = Database['public']['Tables']['curriculum_weeks']['Row'];
type WeeklyProgress = Database['public']['Tables']['weekly_progress']['Row'];
type ReflectionQuestion = Database['public']['Tables']['curriculum_reflection_questions']['Row'];
type CurriculumReflection = Database['public']['Tables']['curriculum_reflections']['Row'];

type CurriculumState = {
  progressRows: WeeklyProgress[];
  questionRows: ReflectionQuestion[];
  reflectionRows: CurriculumReflection[];
  weeks: CurriculumWeek[];
};

type ReflectionDraft = {
  answer: string;
  prompt: string;
  question: ReflectionQuestion;
};

function isWeekComplete(progress?: WeeklyProgress | null) {
  return Boolean(progress?.learn_complete && progress.act_complete && progress.log_complete);
}

function getCompletedPartCount(progress?: WeeklyProgress | null) {
  return [progress?.learn_complete, progress?.act_complete, progress?.log_complete].filter(Boolean).length;
}

function getPrompts(value: Json | null) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((prompt): prompt is string => typeof prompt === 'string');
}

function getQuestionsForWeek(week: CurriculumWeek | null | undefined, questionRows: ReflectionQuestion[]) {
  if (!week) {
    return [];
  }

  const savedQuestions = questionRows
    .filter((question) => question.lesson_id === week.id || question.week_number === week.week_number)
    .sort((a, b) => a.question_order - b.question_order);

  if (savedQuestions.length > 0) {
    return savedQuestions;
  }

  return getPrompts(week.log_prompts).map((prompt, index) => ({
    created_at: week.created_at ?? new Date().toISOString(),
    id: `fallback-question-${week.week_number}-${index + 1}`,
    lesson_id: week.id,
    prompt,
    question_order: index + 1,
    updated_at: week.created_at ?? new Date().toISOString(),
    week_number: week.week_number,
  }));
}

function buildAnswers(
  questions: ReflectionQuestion[],
  answersByQuestionId: Record<string, string>,
  reflectionsByQuestionId: Map<string, CurriculumReflection>,
) {
  return questions.map((question) => ({
    answer:
      answersByQuestionId[question.id]?.trim() ??
      reflectionsByQuestionId.get(question.id)?.reflection_text.trim() ??
      '',
    prompt: question.prompt,
    question,
  }));
}

function getProgressByWeek(progressRows: WeeklyProgress[]) {
  return new Map(progressRows.map((progress) => [progress.week_number, progress]));
}

function getOpenWeek(weeks: CurriculumWeek[], progressRows: WeeklyProgress[]) {
  const progressByWeek = getProgressByWeek(progressRows);
  return weeks.find((week) => !isWeekComplete(progressByWeek.get(week.week_number))) ?? weeks[weeks.length - 1] ?? null;
}

function isWeekUnlocked(weekNumber: number, progressByWeek: Map<number | null, WeeklyProgress>) {
  return weekNumber === 1 || isWeekComplete(progressByWeek.get(weekNumber - 1));
}

function formatShortDate(value?: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' }).format(date);
}

function mergeDemoProgress(
  week: CurriculumWeek,
  currentProgress: WeeklyProgress | null | undefined,
  update: Partial<WeeklyProgress>,
) {
  const timestamp = new Date().toISOString();
  const nextProgress: WeeklyProgress = {
    act_completed_at: currentProgress?.act_completed_at ?? null,
    act_complete: currentProgress?.act_complete ?? false,
    completed_at: currentProgress?.completed_at ?? null,
    created_at: currentProgress?.created_at ?? timestamp,
    id: currentProgress?.id ?? `demo-progress-${week.week_number}`,
    learn_completed_at: currentProgress?.learn_completed_at ?? null,
    learn_complete: currentProgress?.learn_complete ?? false,
    log_completed_at: currentProgress?.log_completed_at ?? null,
    log_complete: currentProgress?.log_complete ?? false,
    profile_id: demoUserId,
    started_at: currentProgress?.started_at ?? timestamp,
    submitted_at: currentProgress?.submitted_at ?? null,
    updated_at: timestamp,
    week_number: week.week_number,
    ...update,
  };

  if (nextProgress.learn_complete && !nextProgress.learn_completed_at) {
    nextProgress.learn_completed_at = timestamp;
  }

  if (nextProgress.act_complete && !nextProgress.act_completed_at) {
    nextProgress.act_completed_at = timestamp;
  }

  if (nextProgress.log_complete && !nextProgress.log_completed_at) {
    nextProgress.log_completed_at = timestamp;
  }

  if (isWeekComplete(nextProgress) && !nextProgress.completed_at) {
    nextProgress.completed_at = timestamp;
    nextProgress.submitted_at = nextProgress.submitted_at ?? timestamp;
  }

  return nextProgress;
}

export default function CurriculumScreen() {
  const { isDemoMode, session } = useAuth();
  const { t } = usePreferences();
  const theme = useTheme();
  const [answersByQuestionId, setAnswersByQuestionId] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number | null>(null);
  const [state, setState] = useState<CurriculumState>({
    progressRows: [],
    questionRows: [],
    reflectionRows: [],
    weeks: [],
  });

  const progressByWeek = useMemo(() => getProgressByWeek(state.progressRows), [state.progressRows]);
  const selectedWeek = useMemo(
    () => state.weeks.find((week) => week.week_number === selectedWeekNumber) ?? getOpenWeek(state.weeks, state.progressRows),
    [selectedWeekNumber, state.progressRows, state.weeks],
  );
  const selectedProgress = selectedWeek ? progressByWeek.get(selectedWeek.week_number) ?? null : null;
  const selectedQuestions = useMemo(
    () => getQuestionsForWeek(selectedWeek, state.questionRows),
    [selectedWeek, state.questionRows],
  );
  const reflectionsByQuestionId = useMemo(
    () => new Map(state.reflectionRows.map((reflection) => [reflection.question_id, reflection])),
    [state.reflectionRows],
  );
  const reflectionDrafts = useMemo(
    () => buildAnswers(selectedQuestions, answersByQuestionId, reflectionsByQuestionId),
    [answersByQuestionId, reflectionsByQuestionId, selectedQuestions],
  );
  const completedWeeks = state.progressRows.filter(isWeekComplete).length;
  const openWeek = useMemo(() => getOpenWeek(state.weeks, state.progressRows), [state.progressRows, state.weeks]);
  const selectedPartCount = getCompletedPartCount(selectedProgress);
  const programProgress = state.weeks.length > 0 ? completedWeeks / state.weeks.length : 0;
  const logReady = reflectionDrafts.length === 3 && reflectionDrafts.every((answer) => Boolean(answer.answer));
  const selectedWeekComplete = isWeekComplete(selectedProgress);
  const hasPersistedQuestions = selectedQuestions.every((question) => !question.id.startsWith('fallback-question-'));
  const canSubmit = Boolean(
    selectedProgress?.learn_complete && selectedProgress.act_complete && logReady && !selectedWeekComplete,
  );

  const loadCurriculum = useCallback(async () => {
    if (isDemoMode && session) {
      const openDemoWeek = getOpenWeek(demoCurriculumWeeks, demoProgress);

      setAnswersByQuestionId({});
      setSelectedWeekNumber(openDemoWeek?.week_number ?? null);
      setState({
        progressRows: demoProgress,
        questionRows: demoReflectionQuestions,
        reflectionRows: demoCurriculumReflections,
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
      const [weeksResult, progressResult, questionsResult, reflectionsResult] = await Promise.all([
        supabase.from('curriculum_weeks').select('*').order('week_number', { ascending: true }),
        supabase
          .from('weekly_progress')
          .select('*')
          .eq('profile_id', session.user.id)
          .order('week_number', { ascending: true }),
        supabase
          .from('curriculum_reflection_questions')
          .select('*')
          .order('week_number', { ascending: true })
          .order('question_order', { ascending: true }),
        supabase
          .from('curriculum_reflections')
          .select('*')
          .eq('profile_id', session.user.id)
          .order('submitted_at', { ascending: false }),
      ]);

      if (weeksResult.error) throw weeksResult.error;
      if (progressResult.error) throw progressResult.error;
      if (questionsResult.error) throw questionsResult.error;
      if (reflectionsResult.error) throw reflectionsResult.error;

      const weeks = weeksResult.data ?? [];
      const progressRows = progressResult.data ?? [];
      const nextOpenWeek = getOpenWeek(weeks, progressRows);

      setAnswersByQuestionId({});
      setSelectedWeekNumber(nextOpenWeek?.week_number ?? null);
      setState({
        progressRows,
        questionRows: questionsResult.data ?? [],
        reflectionRows: reflectionsResult.data ?? [],
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

  function handleSelectWeek(week: CurriculumWeek) {
    const locked = !isWeekUnlocked(week.week_number, progressByWeek);

    if (locked) {
      return;
    }

    setAnswersByQuestionId({});
    setErrorMessage('');
    setSavedMessage('');
    setSelectedWeekNumber(week.week_number);
  }

  async function saveProgress(update: Partial<WeeklyProgress>) {
    if (isDemoMode && session && selectedWeek) {
      setErrorMessage('');
      setSavedMessage('');
      setIsSaving(true);

      const nextProgress = mergeDemoProgress(selectedWeek, selectedProgress, update);

      setState((current) => ({
        ...current,
        progressRows: [
          ...current.progressRows.filter((progress) => progress.week_number !== nextProgress.week_number),
          nextProgress,
        ].sort((a, b) => (a.week_number ?? 0) - (b.week_number ?? 0)),
      }));
      setSavedMessage('Saved in demo mode.');
      setIsSaving(false);
      return;
    }

    if (!supabase || !session || !selectedWeek) {
      return;
    }

    setErrorMessage('');
    setSavedMessage('');
    setIsSaving(true);

    try {
      const nextProgress = {
        act_complete: selectedProgress?.act_complete ?? false,
        learn_complete: selectedProgress?.learn_complete ?? false,
        log_complete: selectedProgress?.log_complete ?? false,
        profile_id: session.user.id,
        week_number: selectedWeek.week_number,
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
    if (!selectedWeek) {
      return;
    }

    const answers = reflectionDrafts;
    const legacyAnswers = answers.map((answer) => ({
      answer: answer.answer,
      prompt: answer.prompt,
      question_id: answer.question.id,
    }));
    const hasEmptyAnswer = answers.length !== 3 || answers.some((answer) => !answer.answer);

    if (hasEmptyAnswer) {
      setErrorMessage('Answer every reflection question before submitting.');
      return;
    }

    if (!isDemoMode && !hasPersistedQuestions) {
      setErrorMessage('Reflection questions are still syncing. Try again in a moment.');
      return;
    }

    if (isDemoMode && session) {
      setErrorMessage('');
      setSavedMessage('');
      setIsSaving(true);

      const submittedAt = new Date().toISOString();
      const completeProgress = mergeDemoProgress(selectedWeek, selectedProgress, {
        act_complete: true,
        completed_at: submittedAt,
        learn_complete: true,
        log_complete: true,
        log_completed_at: submittedAt,
        submitted_at: submittedAt,
      });
      const nextProgressRows = [
        ...state.progressRows.filter((progress) => progress.week_number !== completeProgress.week_number),
        completeProgress,
      ].sort((a, b) => (a.week_number ?? 0) - (b.week_number ?? 0));
      const submittedReflections = answers.map<CurriculumReflection>((answer) => ({
        created_at: submittedAt,
        id: `demo-reflection-${answer.question.week_number}-${answer.question.question_order}-${Date.now()}`,
        lesson_id: selectedWeek.id,
        profile_id: demoUserId,
        question_id: answer.question.id,
        reflection_text: answer.answer,
        submitted_at: submittedAt,
        updated_at: submittedAt,
        visibility: 'private',
      }));
      const submittedQuestionIds = new Set(submittedReflections.map((reflection) => reflection.question_id));
      const nextReflectionRows = [
        ...state.reflectionRows.filter((reflection) => !submittedQuestionIds.has(reflection.question_id)),
        ...submittedReflections,
      ].sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at));

      demoCurriculumReflections.splice(
        0,
        demoCurriculumReflections.length,
        ...[
          ...demoCurriculumReflections.filter((reflection) => !submittedQuestionIds.has(reflection.question_id)),
          ...submittedReflections,
        ].sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at)),
      );

      const nextOpenWeek = getOpenWeek(state.weeks, nextProgressRows);

      setAnswersByQuestionId({});
      setSelectedWeekNumber(nextOpenWeek?.week_number ?? selectedWeek.week_number);
      setState({
        progressRows: nextProgressRows,
        questionRows: state.questionRows,
        reflectionRows: nextReflectionRows,
        weeks: state.weeks,
      });
      setSavedMessage('Week submitted in demo mode.');
      setIsSaving(false);
      return;
    }

    if (!supabase || !session) {
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
        week_number: selectedWeek.week_number,
      };

      const reflectionPayload = answers.map((answer) => ({
        lesson_id: selectedWeek.id,
        profile_id: session.user.id,
        question_id: answer.question.id,
        reflection_text: answer.answer,
        submitted_at: completeProgress.submitted_at,
        visibility: 'private' as const,
      }));

      const [progressResult, logResult, reflectionsResult] = await Promise.all([
        supabase
          .from('weekly_progress')
          .upsert(completeProgress, { onConflict: 'profile_id,week_number' })
          .select('*')
          .single(),
        supabase.from('journal_logs').upsert(
          {
            answers: legacyAnswers as Json,
            profile_id: session.user.id,
            week_number: selectedWeek.week_number,
          },
          { onConflict: 'profile_id,week_number' },
        ),
        supabase
          .from('curriculum_reflections')
          .upsert(reflectionPayload, { onConflict: 'profile_id,question_id' })
          .select('*'),
      ]);

      if (progressResult.error) throw progressResult.error;
      if (logResult.error) throw logResult.error;
      if (reflectionsResult.error) throw reflectionsResult.error;

      const nextProgressRows = [
        ...state.progressRows.filter(
          (progress) => progress.week_number !== progressResult.data.week_number,
        ),
        progressResult.data,
      ].sort((a, b) => (a.week_number ?? 0) - (b.week_number ?? 0));
      const savedQuestionIds = new Set((reflectionsResult.data ?? []).map((reflection) => reflection.question_id));
      const nextReflectionRows = [
        ...state.reflectionRows.filter((reflection) => !savedQuestionIds.has(reflection.question_id)),
        ...(reflectionsResult.data ?? []),
      ].sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at));
      const nextOpenWeek = getOpenWeek(state.weeks, nextProgressRows);

      setAnswersByQuestionId({});
      setSelectedWeekNumber(nextOpenWeek?.week_number ?? selectedWeek.week_number);
      setState({
        progressRows: nextProgressRows,
        questionRows: state.questionRows,
        reflectionRows: nextReflectionRows,
        weeks: state.weeks,
      });
      setSavedMessage('Week submitted. Keep going.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not submit week.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppScreen contentStyle={styles.screenContent}>
      <HeroSection
        eyebrow="52-week program"
        icon={BookOpen}
        subtitle="Sequential lessons, weekly action, and reflection that unlocks the next standard."
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

      {!isLoading && selectedWeek ? (
        <>
          <GlassCard>
            <View style={styles.overviewTop}>
              <View>
                <Text style={[styles.eyebrow, { color: theme.accent }]}>Program progress</Text>
                <Text style={[styles.title, { color: theme.textPrimary }]}>
                  {completedWeeks} of {state.weeks.length} weeks complete
                </Text>
              </View>
              <Text style={[styles.openWeek, { color: theme.textPrimary }]}>
                Week {openWeek?.week_number ?? selectedWeek.week_number}
              </Text>
            </View>
            <ProgressBar value={programProgress} />
          </GlassCard>

          <AppCard>
            <View style={styles.roadmapHeader}>
              <SectionHeader icon={ClipboardList} title="Program roadmap" />
              <Text style={[styles.body, { color: theme.textSecondary }]}>Future weeks unlock in order.</Text>
            </View>
            <View style={styles.roadmapGrid}>
              {state.weeks.map((week) => {
                const weekProgress = progressByWeek.get(week.week_number);
                const complete = isWeekComplete(weekProgress);
                const locked = !isWeekUnlocked(week.week_number, progressByWeek);
                const selected = selectedWeek.week_number === week.week_number;
                const StatusIcon = complete ? CheckCircle2 : locked ? Lock : Circle;

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: locked, selected }}
                    disabled={locked}
                    key={week.id}
                    onPress={() => handleSelectWeek(week)}
                    style={[
                      styles.weekTile,
                      {
                        backgroundColor: selected ? theme.accentSurface : theme.cardMuted,
                        borderColor: selected ? theme.accent : theme.border,
                        opacity: locked ? 0.58 : 1,
                      },
                    ]}>
                    <View style={styles.weekTileTop}>
                      <Text style={[styles.weekNumber, { color: selected ? theme.accent : theme.textPrimary }]}>
                        {week.week_number}
                      </Text>
                      <StatusIcon
                        color={complete ? theme.success : locked ? theme.textMuted : theme.accent}
                        size={17}
                        strokeWidth={2.8}
                      />
                    </View>
                    <Text numberOfLines={2} style={[styles.weekTileTitle, { color: theme.textSecondary }]}>
                      {week.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </AppCard>

          <GradientCard glow variant="dark">
            <View style={styles.weekHeroTop}>
              <Text style={[styles.darkEyebrow, { color: theme.accent }]}>
                Week {selectedWeek.week_number} / {state.weeks.length}
              </Text>
              <Text style={[styles.darkEyebrow, { color: theme.accent }]}>{selectedPartCount} / 3</Text>
            </View>
            <View>
              <Text style={[styles.darkTitle, { color: theme.textInverse }]}>{selectedWeek.title}</Text>
              <Text style={[styles.identity, { color: theme.textInverse }]}>{selectedWeek.identity_statement}</Text>
            </View>
            <View style={styles.phaseRow}>
              <Text style={[styles.darkPill, { color: theme.textInverse }]}>{selectedWeek.program_phase}</Text>
              <Text style={[styles.darkPill, { color: theme.textInverse }]}>
                {selectedWeek.milestone_name ?? 'Keep going'}
              </Text>
            </View>
            <ProgressBar tone="inverse" value={selectedPartCount / 3} />
          </GradientCard>

          <GlassCard>
            <StepHeader
              complete={selectedProgress?.learn_complete}
              completedAt={selectedProgress?.learn_completed_at}
              icon={BookOpen}
              label={selectedWeek.lesson_title ?? 'Lesson'}
            />
            <Text style={[styles.sectionText, { color: theme.textSecondary }]}>{selectedWeek.learn_text}</Text>
            <View style={styles.cardAction}>
              <AppPressButton
                disabled={isSaving || selectedProgress?.learn_complete === true}
                icon={CheckCircle2}
                label={selectedProgress?.learn_complete ? 'Lesson Complete' : 'Mark Lesson Complete'}
                onPress={() => saveProgress({ learn_complete: true })}
                variant={selectedProgress?.learn_complete ? 'secondary' : 'primary'}
              />
            </View>
          </GlassCard>

          <GlassCard>
            <StepHeader
              complete={selectedProgress?.act_complete}
              completedAt={selectedProgress?.act_completed_at}
              icon={Dumbbell}
              label={selectedWeek.activity_title ?? 'Activity'}
            />
            <Text style={[styles.sectionText, { color: theme.textSecondary }]}>{selectedWeek.act_text}</Text>
            <View style={styles.cardAction}>
              <AppPressButton
                disabled={isSaving || selectedProgress?.act_complete === true}
                icon={CheckCircle2}
                label={selectedProgress?.act_complete ? 'Activity Complete' : 'Mark Activity Complete'}
                onPress={() => saveProgress({ act_complete: true })}
                variant={selectedProgress?.act_complete ? 'secondary' : 'primary'}
              />
            </View>
          </GlassCard>

          <GlassCard>
            <StepHeader
              complete={selectedProgress?.log_complete}
              completedAt={selectedProgress?.log_completed_at ?? selectedProgress?.completed_at}
              icon={ClipboardList}
              label="Three reflection questions"
            />
            <View style={styles.prompts}>
              {selectedQuestions.map((question, index) => (
                <FormTextInput
                  editable={!selectedProgress?.log_complete}
                  key={question.id}
                  label={`${index + 1}. ${question.prompt}`}
                  multiline
                  onChangeText={(answer) =>
                    setAnswersByQuestionId((current) => ({ ...current, [question.id]: answer }))
                  }
                  placeholder="Write a clear answer."
                  style={styles.logInput}
                  textAlignVertical="top"
                  value={
                    answersByQuestionId[question.id] ??
                    reflectionsByQuestionId.get(question.id)?.reflection_text ??
                    ''
                  }
                />
              ))}
            </View>
          </GlassCard>

          {savedMessage ? <Text style={[styles.saved, { color: theme.success }]}>{savedMessage}</Text> : null}

          {selectedWeekComplete ? (
            <AppCard muted>
              <Text style={[styles.body, { color: theme.textSecondary }]}>
                Week complete
                {formatShortDate(selectedProgress?.completed_at)
                  ? ` on ${formatShortDate(selectedProgress?.completed_at)}`
                  : ''}
                . Select the next open week to keep building.
              </Text>
            </AppCard>
          ) : canSubmit ? (
            <FloatingCTA
              disabled={isSaving}
              icon={Send}
              label={isSaving ? 'Saving...' : 'Submit Week'}
              onPress={handleSubmitWeek}
            />
          ) : (
            <AppCard muted>
              <Text style={[styles.body, { color: theme.textSecondary }]}>
                Complete the lesson, complete the activity, and answer all three reflection questions to unlock the next week.
              </Text>
            </AppCard>
          )}
        </>
      ) : null}

      {!isLoading && !selectedWeek && !errorMessage ? (
        <AppCard>
          <Text style={[styles.title, { color: theme.textPrimary }]}>No week found.</Text>
          <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
            Seed the 52-week curriculum to begin.
          </Text>
        </AppCard>
      ) : null}
    </AppScreen>
  );
}

function StepHeader({
  complete,
  completedAt,
  icon,
  label,
}: {
  complete?: boolean | null;
  completedAt?: string | null;
  icon: Parameters<typeof SectionHeader>[0]['icon'];
  label: string;
}) {
  const theme = useTheme();
  const dateLabel = complete ? formatShortDate(completedAt) : '';

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
          {complete ? `Saved${dateLabel ? ` ${dateLabel}` : ''}` : 'Open'}
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
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  openWeek: {
    fontSize: 18,
    fontWeight: '900',
  },
  overviewTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'space-between',
  },
  roadmapHeader: {
    gap: spacing.sm,
  },
  roadmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  weekTile: {
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: 92,
    flexGrow: 1,
    gap: spacing.sm,
    minHeight: 86,
    padding: spacing.md,
  },
  weekTileTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekNumber: {
    fontSize: 18,
    fontWeight: '900',
  },
  weekTileTitle: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
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
  darkPill: {
    backgroundColor: 'rgba(255, 249, 239, 0.14)',
    borderColor: 'rgba(255, 249, 239, 0.22)',
    borderRadius: radius.pill,
    borderWidth: 1,
    fontSize: 13,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textTransform: 'uppercase',
  },
  phaseRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  weekHeroTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
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
