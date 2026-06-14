import { type ComponentType, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { BookOpen, CalendarDays, FileText, Lock, Search, TrendingUp } from 'lucide-react-native';

import { AppCard } from '@/components/AppCard';
import { AppPressButton } from '@/components/AppPressButton';
import { AppScreen } from '@/components/AppScreen';
import { FormTextInput } from '@/components/FormTextInput';
import { GlassCard } from '@/components/ui/GlassCard';
import { HeroSection } from '@/components/ui/HeroSection';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { usePreferences } from '@/context/PreferencesContext';
import { useTheme } from '@/hooks/useTheme';
import {
  demoCurriculumReflections,
  demoCurriculumWeeks,
  demoReflectionQuestions,
} from '@/lib/demoData';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type CurriculumWeek = Database['public']['Tables']['curriculum_weeks']['Row'];
type ReflectionQuestion = Database['public']['Tables']['curriculum_reflection_questions']['Row'];
type CurriculumReflection = Database['public']['Tables']['curriculum_reflections']['Row'];

type JournalState = {
  questions: ReflectionQuestion[];
  reflections: CurriculumReflection[];
  weeks: CurriculumWeek[];
};

type JournalItem = {
  question: ReflectionQuestion | null;
  reflection: CurriculumReflection;
  week: CurriculumWeek | null;
};

function formatJournalDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Saved reflection';
  }

  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function includesQuery(value: string | null | undefined, query: string) {
  return value?.toLowerCase().includes(query) ?? false;
}

function buildJournalItems(state: JournalState) {
  const questionsById = new Map(state.questions.map((question) => [question.id, question]));
  const weeksById = new Map(state.weeks.map((week) => [week.id, week]));

  return state.reflections
    .map<JournalItem>((reflection) => {
      const question = questionsById.get(reflection.question_id) ?? null;
      const week = weeksById.get(reflection.lesson_id) ?? null;

      return { question, reflection, week };
    })
    .sort((a, b) => Date.parse(b.reflection.submitted_at) - Date.parse(a.reflection.submitted_at));
}

export default function JournalScreen() {
  const { isDemoMode, session } = useAuth();
  const { t } = usePreferences();
  const theme = useTheme();
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [state, setState] = useState<JournalState>({
    questions: [],
    reflections: [],
    weeks: [],
  });

  const loadJournal = useCallback(async () => {
    if (isDemoMode && session) {
      setState({
        questions: demoReflectionQuestions,
        reflections: demoCurriculumReflections,
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
      const [reflectionsResult, questionsResult, weeksResult] = await Promise.all([
        supabase
          .from('curriculum_reflections')
          .select('*')
          .eq('profile_id', session.user.id)
          .order('submitted_at', { ascending: false }),
        supabase
          .from('curriculum_reflection_questions')
          .select('*')
          .order('week_number', { ascending: true })
          .order('question_order', { ascending: true }),
        supabase.from('curriculum_weeks').select('*').order('week_number', { ascending: true }),
      ]);

      if (reflectionsResult.error) throw reflectionsResult.error;
      if (questionsResult.error) throw questionsResult.error;
      if (weeksResult.error) throw weeksResult.error;

      setState({
        questions: questionsResult.data ?? [],
        reflections: reflectionsResult.data ?? [],
        weeks: weeksResult.data ?? [],
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load your reflection journal.');
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode, session]);

  useEffect(() => {
    loadJournal();
  }, [loadJournal]);

  const journalItems = useMemo(() => buildJournalItems(state), [state]);
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return journalItems;
    }

    return journalItems.filter((item) => {
      const weekLabel = item.week ? `week ${item.week.week_number}` : '';

      return (
        includesQuery(item.reflection.reflection_text, query) ||
        includesQuery(item.question?.prompt, query) ||
        includesQuery(item.week?.title, query) ||
        includesQuery(weekLabel, query)
      );
    });
  }, [journalItems, searchQuery]);

  const reflectedWeekCount = useMemo(
    () => new Set(journalItems.map((item) => item.week?.week_number).filter(Boolean)).size,
    [journalItems],
  );
  const latestReflection = journalItems[0]?.reflection.submitted_at ?? null;
  const earliestReflection = journalItems[journalItems.length - 1]?.reflection.submitted_at ?? null;

  return (
    <AppScreen contentStyle={styles.screenContent}>
      <HeroSection
        eyebrow="Private reflection history"
        icon={FileText}
        subtitle="Search your answers, revisit old standards, and watch your thinking mature over time."
        title={t('journal')}
      />

      {isLoading ? (
        <AppCard>
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading journal...</Text>
          </View>
        </AppCard>
      ) : null}

      {errorMessage ? (
        <AppCard>
          <Text style={[styles.error, { color: theme.error }]}>{errorMessage}</Text>
          <View style={styles.cardAction}>
            <AppPressButton label={t('tryAgain')} onPress={loadJournal} variant="secondary" />
          </View>
        </AppCard>
      ) : null}

      {!isLoading && !errorMessage ? (
        <>
          <GlassCard>
            <View style={styles.privacyRow}>
              <View style={[styles.privacyIcon, { backgroundColor: theme.accentSurface }]}>
                <Lock color={theme.accent} size={18} strokeWidth={2.8} />
              </View>
              <View style={styles.privacyCopy}>
                <Text style={[styles.privacyTitle, { color: theme.textPrimary }]}>Private by default</Text>
                <Text style={[styles.body, { color: theme.textSecondary }]}>
                  These reflections are visible only to you. Sharing can be added later with explicit permissions.
                </Text>
              </View>
            </View>
          </GlassCard>

          <View style={styles.statsGrid}>
            <JournalStat icon={FileText} label="Reflections" value={`${journalItems.length}`} />
            <JournalStat icon={BookOpen} label="Weeks touched" value={`${reflectedWeekCount}`} />
            <JournalStat
              icon={CalendarDays}
              label="Latest"
              value={latestReflection ? formatJournalDate(latestReflection) : 'None yet'}
            />
          </View>

          <AppCard>
            <SectionHeader icon={TrendingUp} title="Growth over time" />
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              {journalItems.length > 0 && earliestReflection && latestReflection
                ? `Your journal spans ${formatJournalDate(earliestReflection)} to ${formatJournalDate(latestReflection)}. Use search to compare how your answers shift across standards, habits, and pressure.`
                : 'Finish curriculum reflections to build a personal record of growth, pressure, and proof.'}
            </Text>
          </AppCard>

          <FormTextInput
            label="Search reflections"
            onChangeText={setSearchQuery}
            placeholder="Search by week, question, or reflection text."
            value={searchQuery}
          />

          <View style={styles.listHeader}>
            <SectionHeader icon={Search} title="Reflection history" />
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              {filteredItems.length} shown
            </Text>
          </View>

          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <GlassCard key={item.reflection.id}>
                <View style={styles.entryTop}>
                  <View style={styles.entryTitleWrap}>
                    <Text style={[styles.entryWeek, { color: theme.accent }]}>
                      Week {item.week?.week_number ?? item.question?.week_number ?? '?'}
                    </Text>
                    <Text style={[styles.entryTitle, { color: theme.textPrimary }]}>
                      {item.week?.title ?? 'Curriculum reflection'}
                    </Text>
                  </View>
                  <View style={[styles.privatePill, { borderColor: theme.border }]}>
                    <Lock color={theme.textMuted} size={13} strokeWidth={2.6} />
                    <Text style={[styles.privateText, { color: theme.textMuted }]}>Private</Text>
                  </View>
                </View>
                <Text style={[styles.prompt, { color: theme.textPrimary }]}>
                  {item.question?.prompt ?? 'Reflection question'}
                </Text>
                <Text style={[styles.reflection, { color: theme.textSecondary }]}>
                  {item.reflection.reflection_text}
                </Text>
                <Text style={[styles.date, { color: theme.textMuted }]}>
                  {formatJournalDate(item.reflection.submitted_at)}
                </Text>
              </GlassCard>
            ))
          ) : (
            <AppCard muted>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                {searchQuery.trim() ? 'No matching reflections.' : 'No reflections yet.'}
              </Text>
              <Text style={[styles.body, { color: theme.textSecondary }]}>
                {searchQuery.trim()
                  ? 'Try a different word, week number, or question theme.'
                  : 'Complete a curriculum week to start building your private reflection history.'}
              </Text>
            </AppCard>
          )}
        </>
      ) : null}
    </AppScreen>
  );
}

function JournalStat({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  label: string;
  value: string;
}) {
  const theme = useTheme();

  return (
    <GlassCard style={styles.statCard}>
      <Icon color={theme.accent} size={22} strokeWidth={2.6} />
      <Text style={[styles.statValue, { color: theme.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </GlassCard>
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
  privacyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  privacyIcon: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  privacyCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  privacyTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    flexBasis: 160,
    flexGrow: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  listHeader: {
    gap: spacing.sm,
  },
  entryTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  entryTitleWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  entryWeek: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  entryTitle: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 27,
  },
  privatePill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  privateText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  prompt: {
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 24,
  },
  reflection: {
    fontSize: 18,
    lineHeight: 28,
  },
  date: {
    fontSize: 14,
    fontWeight: '800',
  },
  body: {
    fontSize: 17,
    lineHeight: 26,
  },
  cardAction: {
    marginTop: spacing.lg,
  },
  error: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '900',
  },
});
