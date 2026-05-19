import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Megaphone, MessageSquare, Users } from 'lucide-react-native';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';

import { AppCard } from '@/components/AppCard';
import { AppPressButton } from '@/components/AppPressButton';
import { AppScreen } from '@/components/AppScreen';
import { FormTextInput } from '@/components/FormTextInput';
import { RouteGuard } from '@/components/RouteGuard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Chapter = Database['public']['Tables']['chapters']['Row'];
type ChapterMember = Database['public']['Tables']['chapter_members']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type WeeklyProgress = Database['public']['Tables']['weekly_progress']['Row'];

type MemberRow = {
  currentWeek: number;
  inactive: boolean;
  lastSubmittedAt: string | null;
  profile: Profile;
  streak: number;
};

function isWeekComplete(progress: WeeklyProgress) {
  return Boolean(progress.learn_complete && progress.act_complete && progress.log_complete);
}

function computeCurrentWeek(progressRows: WeeklyProgress[]) {
  const completed = new Set(progressRows.filter(isWeekComplete).map((progress) => progress.week_number));
  let week = 1;

  while (completed.has(week)) {
    week += 1;
  }

  return week;
}

function computeStreak(progressRows: WeeklyProgress[]) {
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

function getLastSubmittedAt(progressRows: WeeklyProgress[]) {
  return progressRows
    .map((progress) => progress.submitted_at)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
}

function isInactive(lastSubmittedAt: string | null) {
  if (!lastSubmittedAt) {
    return true;
  }

  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  return Date.now() - new Date(lastSubmittedAt).getTime() > fourteenDays;
}

function formatDate(value: string | null) {
  if (!value) {
    return 'No submissions';
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

export default function FacilitatorScreen() {
  const { profile, session } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
  const [announcementBody, setAnnouncementBody] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [promptBody, setPromptBody] = useState('');
  const [promptTitle, setPromptTitle] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  const canAccess = profile?.role === 'facilitator' || profile?.role === 'admin';

  const loadDashboard = useCallback(async () => {
    if (!supabase || !session || !canAccess) {
      setIsLoading(false);
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const [ownedChapterResult, membershipResult] = await Promise.all([
        supabase.from('chapters').select('*').eq('facilitator_id', session.user.id).limit(1),
        supabase
          .from('chapter_members')
          .select('*')
          .eq('profile_id', session.user.id)
          .eq('role', 'facilitator')
          .limit(1),
      ]);

      if (ownedChapterResult.error) throw ownedChapterResult.error;
      if (membershipResult.error) throw membershipResult.error;

      let nextChapter = ownedChapterResult.data?.[0] ?? null;

      if (!nextChapter && membershipResult.data?.[0]?.chapter_id) {
        const chapterResult = await supabase
          .from('chapters')
          .select('*')
          .eq('id', membershipResult.data[0].chapter_id)
          .single();

        if (chapterResult.error) throw chapterResult.error;
        nextChapter = chapterResult.data;
      }

      setChapter(nextChapter);

      if (!nextChapter) {
        setMembers([]);
        return;
      }

      const memberResult = await supabase
        .from('chapter_members')
        .select('*')
        .eq('chapter_id', nextChapter.id);

      if (memberResult.error) throw memberResult.error;

      const memberships = (memberResult.data ?? []) as ChapterMember[];
      const profileIds = memberships
        .map((membership) => membership.profile_id)
        .filter((id): id is string => Boolean(id));

      if (profileIds.length === 0) {
        setMembers([]);
        return;
      }

      const [profilesResult, progressResult] = await Promise.all([
        supabase.from('profiles').select('*').in('id', profileIds),
        supabase
          .from('weekly_progress')
          .select('*')
          .in('profile_id', profileIds)
          .order('week_number', { ascending: true }),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (progressResult.error) throw progressResult.error;

      const progressByProfile = new Map<string, WeeklyProgress[]>();

      for (const progress of progressResult.data ?? []) {
        if (!progress.profile_id) continue;
        progressByProfile.set(progress.profile_id, [
          ...(progressByProfile.get(progress.profile_id) ?? []),
          progress,
        ]);
      }

      setMembers(
        (profilesResult.data ?? []).map((memberProfile) => {
          const progressRows = progressByProfile.get(memberProfile.id) ?? [];
          const lastSubmittedAt = getLastSubmittedAt(progressRows);

          return {
            currentWeek: computeCurrentWeek(progressRows),
            inactive: isInactive(lastSubmittedAt),
            lastSubmittedAt,
            profile: memberProfile,
            streak: computeStreak(progressRows),
          };
        }),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load facilitator dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, [canAccess, session]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function markAttendance(memberProfileId: string) {
    if (!supabase || !chapter) {
      return;
    }

    setErrorMessage('');
    setSavedMessage('');
    setIsSaving(true);

    try {
      const { error } = await supabase.from('attendance').insert({
        chapter_id: chapter.id,
        profile_id: memberProfileId,
      });

      if (error) throw error;

      setSavedMessage('Attendance marked.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not mark attendance.');
    } finally {
      setIsSaving(false);
    }
  }

  async function createPost(postType: 'announcement' | 'weekly_prompt') {
    if (!supabase || !session || !chapter) {
      return;
    }

    const title = postType === 'announcement' ? announcementTitle : promptTitle;
    const body = postType === 'announcement' ? announcementBody : promptBody;

    if (!title.trim() || !body.trim()) {
      setErrorMessage('Add a title and body before posting.');
      return;
    }

    setErrorMessage('');
    setSavedMessage('');
    setIsSaving(true);

    try {
      const { error } = await supabase.from('chapter_posts').insert({
        author_id: session.user.id,
        body: body.trim(),
        chapter_id: chapter.id,
        post_type: postType,
        title: title.trim(),
      });

      if (error) throw error;

      if (postType === 'announcement') {
        setAnnouncementTitle('');
        setAnnouncementBody('');
        setSavedMessage('Announcement posted.');
      } else {
        setPromptTitle('');
        setPromptBody('');
        setSavedMessage('Weekly prompt posted.');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not create post.');
    } finally {
      setIsSaving(false);
    }
  }

  const memberTableStyle = useMemo(
    () => [styles.memberList, isWide ? styles.memberListWide : null],
    [isWide],
  );

  return (
    <RouteGuard mode="protected">
      <AppScreen contentStyle={styles.screenContent} innerStyle={isWide ? styles.wideInner : null}>
        <View style={styles.header}>
          <Text style={styles.heading}>Facilitator</Text>
          <Text style={styles.subheading}>Support the group. Keep it clear.</Text>
        </View>

        {!canAccess ? (
          <AppCard>
            <Text style={styles.title}>Facilitator access only.</Text>
            <Text style={styles.body}>This dashboard is for facilitators and admins.</Text>
          </AppCard>
        ) : null}

        {canAccess && isLoading ? (
          <AppCard>
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.black} />
              <Text style={styles.loadingText}>Loading chapter...</Text>
            </View>
          </AppCard>
        ) : null}

        {errorMessage ? (
          <AppCard>
            <Text style={styles.error}>{errorMessage}</Text>
            <View style={styles.cardAction}>
              <AppPressButton label="Try again" onPress={loadDashboard} variant="secondary" />
            </View>
          </AppCard>
        ) : null}

        {savedMessage ? <Text style={styles.saved}>{savedMessage}</Text> : null}

        {canAccess && !isLoading && !chapter ? (
          <AppCard>
            <Text style={styles.title}>No chapter assigned.</Text>
            <Text style={styles.body}>Create or assign a chapter before using facilitator tools.</Text>
          </AppCard>
        ) : null}

        {canAccess && chapter ? (
          <>
            <AppCard tone="dark">
              <Text style={styles.darkEyebrow}>Your chapter</Text>
              <Text style={styles.darkTitle}>{chapter.name}</Text>
              <Text style={[styles.body, styles.darkBody]}>
                {chapter.region ? `${chapter.region}, ` : ''}
                {chapter.country ?? 'Local chapter'}
              </Text>
            </AppCard>

            <AppCard>
              <SectionHeader icon={Users} title="Members" subtitle="Track progress, attendance, and inactivity." />
              {members.length === 0 ? (
                <EmptyState body="No members have joined this chapter yet." icon={Users} title="No members yet." />
              ) : (
                <View style={memberTableStyle}>
                  {members.map((member) => (
                    <MemberRow
                      key={member.profile.id}
                      disabled={isSaving}
                      isWide={isWide}
                      member={member}
                      onMarkAttendance={markAttendance}
                    />
                  ))}
                </View>
              )}
            </AppCard>

            <View style={[styles.forms, isWide ? styles.formsWide : null]}>
              <PostForm
                body={announcementBody}
                bodyLabel="Announcement body"
                buttonLabel="Create announcement"
                cardStyle={isWide ? styles.formCardWide : null}
                disabled={isSaving}
                onBodyChange={setAnnouncementBody}
                onSubmit={() => createPost('announcement')}
                onTitleChange={setAnnouncementTitle}
                title="Create announcement"
                titleInput={announcementTitle}
              />
              <PostForm
                body={promptBody}
                bodyLabel="Prompt body"
                buttonLabel="Create weekly prompt"
                cardStyle={isWide ? styles.formCardWide : null}
                disabled={isSaving}
                onBodyChange={setPromptBody}
                onSubmit={() => createPost('weekly_prompt')}
                onTitleChange={setPromptTitle}
                title="Create weekly prompt"
                titleInput={promptTitle}
              />
            </View>
          </>
        ) : null}
      </AppScreen>
    </RouteGuard>
  );
}

function MemberRow({
  disabled,
  isWide,
  member,
  onMarkAttendance,
}: {
  disabled: boolean;
  isWide: boolean;
  member: MemberRow;
  onMarkAttendance: (profileId: string) => void;
}) {
  return (
    <View style={[styles.memberRow, isWide ? styles.memberRowWide : null]}>
      <View style={styles.memberMain}>
        <Text style={styles.memberName}>{member.profile.full_name ?? 'Unnamed member'}</Text>
        <Text style={styles.memberMeta}>Week {member.currentWeek}</Text>
      </View>
      <View style={styles.memberStats}>
        <Text style={styles.statLabel}>Last submitted</Text>
        <Text style={styles.statValue}>{formatDate(member.lastSubmittedAt)}</Text>
      </View>
      <View style={styles.memberStats}>
        <Text style={styles.statLabel}>Streak</Text>
        <Text style={styles.statValue}>{member.streak}</Text>
      </View>
      <View style={[styles.flag, member.inactive ? styles.flagInactive : styles.flagActive]}>
        <Text style={[styles.flagText, member.inactive ? styles.flagInactiveText : styles.flagActiveText]}>
          {member.inactive ? 'Inactive' : 'Active'}
        </Text>
      </View>
      <View style={styles.attendanceAction}>
        <AppPressButton
          disabled={disabled}
          icon={CalendarCheck}
          label="Mark attendance"
          onPress={() => onMarkAttendance(member.profile.id)}
          variant="secondary"
        />
      </View>
    </View>
  );
}

function PostForm({
  body,
  bodyLabel,
  buttonLabel,
  cardStyle,
  disabled,
  onBodyChange,
  onSubmit,
  onTitleChange,
  title,
  titleInput,
}: {
  body: string;
  bodyLabel: string;
  buttonLabel: string;
  cardStyle?: StyleProp<ViewStyle>;
  disabled: boolean;
  onBodyChange: (value: string) => void;
  onSubmit: () => void;
  onTitleChange: (value: string) => void;
  title: string;
  titleInput: string;
}) {
  return (
    <AppCard style={cardStyle}>
      <SectionHeader icon={title.includes('announcement') ? Megaphone : MessageSquare} title={title} />
      <View style={styles.form}>
        <FormTextInput label="Title" onChangeText={onTitleChange} placeholder="Short title" value={titleInput} />
        <FormTextInput
          label={bodyLabel}
          multiline
          onChangeText={onBodyChange}
          placeholder="Write clearly."
          style={styles.multiline}
          textAlignVertical="top"
          value={body}
        />
      </View>
      <View style={styles.cardAction}>
        <AppPressButton
          disabled={disabled}
          icon={title.includes('announcement') ? Megaphone : MessageSquare}
          label={buttonLabel}
          onPress={onSubmit}
        />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    justifyContent: 'flex-start',
  },
  wideInner: {
    maxWidth: 1040,
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
  eyebrow: {
    color: colors.mutedText,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40,
  },
  darkEyebrow: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  darkTitle: {
    color: colors.inverseText,
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 44,
  },
  body: {
    color: colors.mutedText,
    fontSize: 18,
    lineHeight: 28,
    marginTop: spacing.md,
  },
  darkBody: {
    color: colors.inverseMuted,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  memberList: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  memberListWide: {
    gap: spacing.sm,
  },
  memberRow: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  memberRowWide: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  memberMain: {
    flex: 2,
    gap: spacing.xs,
  },
  memberName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  memberMeta: {
    color: colors.mutedText,
    fontSize: 16,
    fontWeight: '800',
  },
  memberStats: {
    flex: 1,
    gap: spacing.xs,
  },
  statLabel: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  statValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  flag: {
    alignSelf: 'flex-start',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  flagActive: {
    backgroundColor: colors.accentSurface,
    borderColor: colors.gold,
  },
  flagInactive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  flagText: {
    fontSize: 14,
    fontWeight: '900',
  },
  flagActiveText: {
    color: colors.warning,
  },
  flagInactiveText: {
    color: colors.text,
  },
  attendanceAction: {
    flex: 1,
    minWidth: 180,
  },
  forms: {
    gap: spacing.lg,
  },
  formsWide: {
    alignItems: 'stretch',
    flexDirection: 'row',
  },
  formCardWide: {
    flex: 1,
  },
  form: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  multiline: {
    minHeight: 112,
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
  saved: {
    color: colors.success,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
});
