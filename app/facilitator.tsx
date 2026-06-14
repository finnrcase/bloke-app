import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  KeyRound,
  MapPin,
  Megaphone,
  MessageSquare,
  Save,
  Ticket,
  Users,
  XCircle,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  Pressable,
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
import { GradientCard } from '@/components/ui/GradientCard';
import { HeroSection } from '@/components/ui/HeroSection';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { radius, spacing, typography } from '@/constants/theme';
import { useAdminState } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { usePreferences } from '@/context/PreferencesContext';
import { useTheme } from '@/hooks/useTheme';
import {
  demoChapter,
  demoJoinRequests,
  demoMemberProfiles,
  getDemoProgressForProfile,
} from '@/lib/demoData';
import { supabase } from '@/lib/supabase';
import { editChapterAction, generateInviteCodeAction, reviewMemberAction } from '@/lib/supabase/protectedActions';
import { Database } from '@/types/database';

type Chapter = Database['public']['Tables']['chapters']['Row'];
type ChapterMember = Database['public']['Tables']['chapter_members']['Row'];
type ChapterJoinRequest = Database['public']['Tables']['chapter_join_requests']['Row'];
type InviteCode = Database['public']['Tables']['invite_codes']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type WeeklyProgress = Database['public']['Tables']['weekly_progress']['Row'];

type MemberRow = {
  currentWeek: number;
  inactive: boolean;
  lastSubmittedAt: string | null;
  profile: Profile;
  streak: number;
};

type JoinRequestRow = {
  profile: Profile | null;
  request: ChapterJoinRequest;
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

function parseCoordinate(value: string, label: 'latitude' | 'longitude') {
  if (!value.trim()) return null;

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Enter a valid ${label}.`);
  }

  if (label === 'latitude' && (parsed < -90 || parsed > 90)) {
    throw new Error('Latitude must be between -90 and 90.');
  }

  if (label === 'longitude' && (parsed < -180 || parsed > 180)) {
    throw new Error('Longitude must be between -180 and 180.');
  }

  return parsed;
}

function generateReadableInviteCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segments = Array.from({ length: 2 }, () =>
    Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(''),
  );

  return `BLOKE-${segments.join('-')}`;
}

function parseInviteExpiration(value: string) {
  if (!value.trim()) return null;

  const parsed = new Date(value.trim());

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Enter expiration as YYYY-MM-DD, or leave it blank.');
  }

  if (parsed.getTime() <= Date.now()) {
    throw new Error('Expiration must be in the future.');
  }

  return parsed.toISOString();
}

function parseInviteMaxUses(value: string) {
  if (!value.trim()) return null;

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error('Max uses must be a whole number above zero.');
  }

  return parsed;
}

export default function FacilitatorScreen() {
  const { isDemoMode, profile, session } = useAuth();
  const adminState = useAdminState();
  const { t } = usePreferences();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
  const [announcementBody, setAnnouncementBody] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [chapterDescription, setChapterDescription] = useState('');
  const [chapterIsPublic, setChapterIsPublic] = useState(true);
  const [chapterJoinPolicy, setChapterJoinPolicy] = useState<'invite_code' | 'request' | 'open'>('invite_code');
  const [chapterLatitude, setChapterLatitude] = useState('');
  const [chapterLongitude, setChapterLongitude] = useState('');
  const [chapterMeetingDay, setChapterMeetingDay] = useState('');
  const [chapterMeetingLocation, setChapterMeetingLocation] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [inviteExpiresAt, setInviteExpiresAt] = useState('');
  const [inviteMaxUses, setInviteMaxUses] = useState('10');
  const [joinRequests, setJoinRequests] = useState<JoinRequestRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [promptBody, setPromptBody] = useState('');
  const [promptTitle, setPromptTitle] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  const canAccess = adminState.isAdmin || adminState.leaderMemberships.length > 0;

  function hydrateChapterDraft(nextChapter: Chapter | null) {
    setChapterDescription(nextChapter?.description ?? '');
    setChapterIsPublic(nextChapter?.is_public ?? true);
    setChapterJoinPolicy(nextChapter?.join_policy ?? 'invite_code');
    setChapterLatitude(nextChapter?.latitude === null || nextChapter?.latitude === undefined ? '' : String(nextChapter.latitude));
    setChapterLongitude(nextChapter?.longitude === null || nextChapter?.longitude === undefined ? '' : String(nextChapter.longitude));
    setChapterMeetingDay(nextChapter?.meeting_day ?? '');
    setChapterMeetingLocation(nextChapter?.meeting_location ?? '');
  }

  const loadDashboard = useCallback(async () => {
    if (isDemoMode && session && canAccess) {
      setChapter(demoChapter);
      hydrateChapterDraft(demoChapter);
      setJoinRequests(
        demoJoinRequests.map((request) => ({
          profile: demoMemberProfiles.find((memberProfile) => memberProfile.id === request.profile_id) ?? null,
          request,
        })),
      );
      setMembers(
        demoMemberProfiles.map((memberProfile) => {
          const progressRows = getDemoProgressForProfile(memberProfile.id);
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
      setInviteCodes([
        {
          chapter_id: demoChapter.id,
          code: 'BLOKE-DEMO-2026',
          created_at: new Date().toISOString(),
          created_by: session.user.id,
          current_uses: 2,
          expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
          id: 'demo-invite-code',
          max_uses: 10,
        },
      ]);
      setErrorMessage('');
      setIsLoading(false);
      return;
    }

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
          .in('role', ['facilitator', 'chapter_leader'])
          .eq('status', 'active')
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
      hydrateChapterDraft(nextChapter);

      if (!nextChapter) {
        setMembers([]);
        setJoinRequests([]);
        setInviteCodes([]);
        return;
      }

      const memberResult = await supabase
        .from('chapter_members')
        .select('*')
        .eq('chapter_id', nextChapter.id);

      if (memberResult.error) throw memberResult.error;

      const memberships = (memberResult.data ?? []) as ChapterMember[];
      const requestsResult = await supabase
        .from('chapter_join_requests')
        .select('*')
        .eq('chapter_id', nextChapter.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (requestsResult.error) throw requestsResult.error;

      const pendingRequests = (requestsResult.data ?? []) as ChapterJoinRequest[];
      const requestProfileIds = pendingRequests.map((request) => request.profile_id);
      let requestProfiles: Profile[] = [];

      if (requestProfileIds.length > 0) {
        const requestProfilesResult = await supabase
          .from('profiles')
          .select('*')
          .in('id', requestProfileIds);

        if (requestProfilesResult.error) throw requestProfilesResult.error;
        requestProfiles = requestProfilesResult.data ?? [];
      }

      setJoinRequests(
        pendingRequests.map((request) => ({
          profile: requestProfiles.find((requestProfile) => requestProfile.id === request.profile_id) ?? null,
          request,
        })),
      );

      const inviteCodesResult = await supabase
        .from('invite_codes')
        .select('*')
        .eq('chapter_id', nextChapter.id)
        .order('created_at', { ascending: false });

      if (inviteCodesResult.error) throw inviteCodesResult.error;
      setInviteCodes(inviteCodesResult.data ?? []);

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
  }, [canAccess, isDemoMode, session]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function markAttendance(memberProfileId: string) {
    if (isDemoMode) {
      setErrorMessage('');
      setSavedMessage('Attendance marked in demo mode.');
      return;
    }

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

  async function saveChapterDetails() {
    if (!chapter) return;

    setErrorMessage('');
    setSavedMessage('');
    setIsSaving(true);

    try {
      const nextLatitude = parseCoordinate(chapterLatitude, 'latitude');
      const nextLongitude = parseCoordinate(chapterLongitude, 'longitude');
      const updates: Database['public']['Tables']['chapters']['Update'] = {
        description: chapterDescription.trim() || null,
        is_public: chapterIsPublic,
        join_policy: chapterJoinPolicy,
        latitude: nextLatitude,
        longitude: nextLongitude,
        meeting_day: chapterMeetingDay.trim() || null,
        meeting_location: chapterMeetingLocation.trim() || null,
        public_join_enabled: chapterJoinPolicy === 'open',
      };

      if (isDemoMode) {
        const nextChapter = { ...chapter, ...updates };
        setChapter(nextChapter);
        hydrateChapterDraft(nextChapter);
        setSavedMessage('Chapter details saved in demo mode.');
        return;
      }

      if (!supabase) {
        throw new Error('Supabase is not configured. Add your Expo public Supabase env vars.');
      }

      await editChapterAction(profile, adminState.leaderMemberships, chapter.id, updates);

      setSavedMessage('Chapter details saved.');
      await loadDashboard();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save chapter details.');
    } finally {
      setIsSaving(false);
    }
  }

  async function reviewJoinRequest(requestId: string, nextStatus: 'approved' | 'rejected') {
    setErrorMessage('');
    setSavedMessage('');
    setIsSaving(true);

    try {
      if (isDemoMode) {
        setJoinRequests((current) => current.filter((row) => row.request.id !== requestId));
        setSavedMessage(nextStatus === 'approved' ? 'Join request approved in demo mode.' : 'Join request rejected in demo mode.');
        return;
      }

      if (!supabase) {
        throw new Error('Supabase is not configured. Add your Expo public Supabase env vars.');
      }

      if (!chapter) {
        throw new Error('No chapter selected.');
      }

      await reviewMemberAction(profile, adminState.leaderMemberships, chapter.id, requestId, nextStatus);

      setSavedMessage(nextStatus === 'approved' ? 'Join request approved.' : 'Join request rejected.');
      await loadDashboard();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not review join request.');
    } finally {
      setIsSaving(false);
    }
  }

  async function generateInviteCode() {
    if (!chapter || !session) return;

    setErrorMessage('');
    setSavedMessage('');
    setIsSaving(true);

    try {
      const maxUses = parseInviteMaxUses(inviteMaxUses);
      const expiresAt = parseInviteExpiration(inviteExpiresAt);
      const nextCode: InviteCode = {
        chapter_id: chapter.id,
        code: generateReadableInviteCode(),
        created_at: new Date().toISOString(),
        created_by: session.user.id,
        current_uses: 0,
        expires_at: expiresAt,
        id: `invite-${Date.now()}`,
        max_uses: maxUses,
      };

      if (isDemoMode) {
        setInviteCodes((current) => [nextCode, ...current]);
        setSavedMessage('Invite code generated in demo mode.');
        return;
      }

      await generateInviteCodeAction(profile, adminState.leaderMemberships, {
        chapter_id: chapter.id,
        code: nextCode.code,
        created_by: session.user.id,
        expires_at: expiresAt,
        max_uses: maxUses,
      });

      setSavedMessage('Invite code generated.');
      await loadDashboard();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not generate invite code.');
    } finally {
      setIsSaving(false);
    }
  }

  async function createPost(postType: 'announcement' | 'weekly_prompt') {
    if (isDemoMode) {
      const title = postType === 'announcement' ? announcementTitle : promptTitle;
      const body = postType === 'announcement' ? announcementBody : promptBody;

      if (!title.trim() || !body.trim()) {
        setErrorMessage('Add a title and body before posting.');
        return;
      }

      setErrorMessage('');

      if (postType === 'announcement') {
        setAnnouncementTitle('');
        setAnnouncementBody('');
        setSavedMessage('Announcement saved in demo mode.');
      } else {
        setPromptTitle('');
        setPromptBody('');
        setSavedMessage('Weekly prompt saved in demo mode.');
      }

      return;
    }

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
        <HeroSection
          eyebrow="Chapter operations"
          icon={Users}
          subtitle="Support the group without turning the app into admin clutter."
          title={t('facilitator')}
        />

        {!canAccess ? (
          <AppCard>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Facilitator access only.</Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>This dashboard is for facilitators and admins.</Text>
          </AppCard>
        ) : null}

        {canAccess && isLoading ? (
          <AppCard>
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.accent} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading chapter...</Text>
            </View>
          </AppCard>
        ) : null}

        {errorMessage ? (
          <AppCard>
            <Text style={[styles.error, { color: theme.error }]}>{errorMessage}</Text>
            <View style={styles.cardAction}>
              <AppPressButton label={t('tryAgain')} onPress={loadDashboard} variant="secondary" />
            </View>
          </AppCard>
        ) : null}

        {savedMessage ? <Text style={[styles.saved, { color: theme.success }]}>{savedMessage}</Text> : null}

        {canAccess && !isLoading && !chapter ? (
          <AppCard>
            <Text style={[styles.title, { color: theme.textPrimary }]}>No chapter assigned.</Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              Create or assign a chapter before using facilitator tools.
            </Text>
          </AppCard>
        ) : null}

        {canAccess && chapter ? (
          <>
            <GradientCard variant="dark">
              <Text style={[styles.darkEyebrow, { color: theme.accent }]}>Your chapter</Text>
              <Text style={[styles.darkTitle, { color: theme.textInverse }]}>{chapter.name}</Text>
              <Text style={[styles.body, { color: theme.textInverseMuted }]}>
                {chapter.region ? `${chapter.region}, ` : ''}
                {chapter.country ?? 'Local chapter'}
              </Text>
            </GradientCard>

            <AppCard>
              <SectionHeader icon={MapPin} title="Chapter details" subtitle="Keep discovery information accurate." />
              <View style={styles.form}>
                <FormTextInput
                  label="Description"
                  multiline
                  onChangeText={setChapterDescription}
                  placeholder="What members should know"
                  style={styles.multiline}
                  textAlignVertical="top"
                  value={chapterDescription}
                />
                <FormTextInput label="Meeting day" onChangeText={setChapterMeetingDay} placeholder="Tuesday" value={chapterMeetingDay} />
                <FormTextInput
                  label="Meeting location"
                  onChangeText={setChapterMeetingLocation}
                  placeholder="Community center"
                  value={chapterMeetingLocation}
                />
                <View style={styles.coordinateRow}>
                  <View style={styles.coordinateField}>
                    <FormTextInput
                      inputMode="decimal"
                      keyboardType="decimal-pad"
                      label="Latitude"
                      onChangeText={setChapterLatitude}
                      placeholder="Optional"
                      value={chapterLatitude}
                    />
                  </View>
                  <View style={styles.coordinateField}>
                    <FormTextInput
                      inputMode="decimal"
                      keyboardType="decimal-pad"
                      label="Longitude"
                      onChangeText={setChapterLongitude}
                      placeholder="Optional"
                      value={chapterLongitude}
                    />
                  </View>
                </View>
                <ChoiceGroup
                  label="Visibility"
                  options={[
                    { label: 'Public', value: 'public' },
                    { label: 'Private', value: 'private' },
                  ]}
                  value={chapterIsPublic ? 'public' : 'private'}
                  onChange={(value) => setChapterIsPublic(value === 'public')}
                />
                <ChoiceGroup
                  label="Join policy"
                  options={[
                    { label: 'Invite', value: 'invite_code' },
                    { label: 'Request', value: 'request' },
                    { label: 'Open', value: 'open' },
                  ]}
                  value={chapterJoinPolicy}
                  onChange={(value) => setChapterJoinPolicy(value as 'invite_code' | 'request' | 'open')}
                />
              </View>
              <View style={styles.cardAction}>
                <AppPressButton disabled={isSaving} icon={Save} label="Save chapter details" onPress={saveChapterDetails} variant="secondary" />
              </View>
            </AppCard>

            <AppCard>
              <SectionHeader icon={Ticket} title="Invite code generator" subtitle="Create limited-use codes with optional expiration." />
              <View style={styles.form}>
                <View style={styles.coordinateRow}>
                  <View style={styles.coordinateField}>
                    <FormTextInput
                      inputMode="numeric"
                      keyboardType="number-pad"
                      label="Max uses"
                      onChangeText={setInviteMaxUses}
                      placeholder="10"
                      value={inviteMaxUses}
                    />
                  </View>
                  <View style={styles.coordinateField}>
                    <FormTextInput
                      label="Expires on"
                      onChangeText={setInviteExpiresAt}
                      placeholder="YYYY-MM-DD"
                      value={inviteExpiresAt}
                    />
                  </View>
                </View>
              </View>
              <View style={styles.cardAction}>
                <AppPressButton disabled={isSaving} icon={KeyRound} label="Generate invite code" onPress={generateInviteCode} variant="accent" />
              </View>
              <View style={styles.inviteList}>
                {inviteCodes.length === 0 ? (
                  <EmptyState body="Generated invite codes will appear here." icon={Ticket} title="No invite codes yet" />
                ) : (
                  inviteCodes.map((inviteCode) => <InviteCodeCard inviteCode={inviteCode} key={inviteCode.id} />)
                )}
              </View>
            </AppCard>

            <AppCard>
              <SectionHeader icon={Users} title="Pending approvals" subtitle="Approve invite redemptions and join requests." />
              {joinRequests.length === 0 ? (
                <EmptyState body="No pending approvals." icon={Users} title="All clear" />
              ) : (
                <View style={styles.requestList}>
                  {joinRequests.map((row) => (
                    <JoinRequestCard
                      disabled={isSaving}
                      key={row.request.id}
                      row={row}
                      onApprove={() => reviewJoinRequest(row.request.id, 'approved')}
                      onReject={() => reviewJoinRequest(row.request.id, 'rejected')}
                    />
                  ))}
                </View>
              )}
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
  const theme = useTheme();

  return (
    <View style={[styles.memberRow, { backgroundColor: theme.card, borderColor: theme.border }, isWide ? styles.memberRowWide : null]}>
      <View style={styles.memberMain}>
        <UserAvatar imageUrl={member.profile.avatar_url} name={member.profile.full_name ?? member.profile.username} size={42} />
        <View style={styles.memberCopy}>
          <Text style={[styles.memberName, { color: theme.textPrimary }]}>{member.profile.full_name ?? 'Unnamed member'}</Text>
          <Text style={[styles.memberMeta, { color: theme.textSecondary }]}>Week {member.currentWeek}</Text>
        </View>
      </View>
      <View style={styles.memberStats}>
        <Text style={[styles.statLabel, { color: theme.textMuted }]}>Last submitted</Text>
        <Text style={[styles.statValue, { color: theme.textPrimary }]}>{formatDate(member.lastSubmittedAt)}</Text>
      </View>
      <View style={styles.memberStats}>
        <Text style={[styles.statLabel, { color: theme.textMuted }]}>Streak</Text>
        <Text style={[styles.statValue, { color: theme.textPrimary }]}>{member.streak}</Text>
      </View>
      <View
        style={[
          styles.flag,
          {
            backgroundColor: member.inactive ? theme.cardMuted : theme.accentSurface,
            borderColor: member.inactive ? theme.border : theme.accentBorder,
          },
        ]}>
        <Text style={[styles.flagText, { color: member.inactive ? theme.textPrimary : theme.warning }]}>
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

function JoinRequestCard({
  disabled,
  onApprove,
  onReject,
  row,
}: {
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
  row: JoinRequestRow;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.requestCard, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
      <View style={styles.requestProfileCopy}>
        <UserAvatar
          imageUrl={row.profile?.avatar_url}
          name={row.profile?.full_name ?? row.profile?.username ?? `Profile ${row.request.profile_id.slice(0, 8)}`}
          size={42}
        />
        <View style={styles.memberCopy}>
          <Text style={[styles.memberName, { color: theme.textPrimary }]}>
            {row.profile?.full_name ?? `Profile ${row.request.profile_id.slice(0, 8)}`}
          </Text>
          <Text style={[styles.memberMeta, { color: theme.textSecondary }]}>
            {row.request.message ?? 'No message included.'}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>
            Requested {formatDate(row.request.created_at)}
          </Text>
        </View>
      </View>
      <View style={styles.requestActions}>
        <View style={styles.requestAction}>
          <AppPressButton disabled={disabled} icon={XCircle} label="Reject" onPress={onReject} variant="secondary" />
        </View>
        <View style={styles.requestAction}>
          <AppPressButton disabled={disabled} icon={CheckCircle2} label="Approve" onPress={onApprove} variant="accent" />
        </View>
      </View>
    </View>
  );
}

function InviteCodeCard({ inviteCode }: { inviteCode: InviteCode }) {
  const theme = useTheme();
  const isExpired = inviteCode.expires_at ? new Date(inviteCode.expires_at).getTime() <= Date.now() : false;
  const isSpent = inviteCode.max_uses !== null && inviteCode.current_uses >= inviteCode.max_uses;

  return (
    <View style={[styles.inviteCard, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
      <View style={styles.requestCopy}>
        <Text style={[styles.inviteCode, { color: theme.textPrimary }]}>{inviteCode.code}</Text>
        <Text style={[styles.memberMeta, { color: theme.textSecondary }]}>
          {inviteCode.current_uses}/{inviteCode.max_uses ?? '∞'} uses
          {inviteCode.expires_at ? ` · expires ${formatDate(inviteCode.expires_at)}` : ' · no expiration'}
        </Text>
      </View>
      <View
        style={[
          styles.flag,
          {
            backgroundColor: isExpired || isSpent ? theme.card : theme.accentSurface,
            borderColor: isExpired || isSpent ? theme.border : theme.accentBorder,
          },
        ]}>
        <Text style={[styles.flagText, { color: isExpired || isSpent ? theme.textMuted : theme.warning }]}>
          {isExpired ? 'Expired' : isSpent ? 'Limit reached' : 'Active'}
        </Text>
      </View>
    </View>
  );
}

function ChoiceGroup({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  value: string;
}) {
  const theme = useTheme();

  return (
    <View style={styles.choiceGroup}>
      <Text style={[styles.choiceLabel, { color: theme.textPrimary }]}>{label}</Text>
      <View style={styles.choiceRow}>
        {options.map((option) => {
          const active = option.value === value;

          return (
            <Pressable
              accessibilityLabel={`${label}: ${option.label}`}
              accessibilityRole="button"
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[
                styles.choiceButton,
                {
                  backgroundColor: active ? theme.accent : theme.card,
                  borderColor: active ? theme.accent : theme.border,
                },
              ]}>
              <Text style={[styles.choiceText, { color: active ? theme.accentText : theme.textPrimary }]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
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
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40,
  },
  darkEyebrow: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  darkTitle: {
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 44,
  },
  body: {
    fontSize: 18,
    lineHeight: 28,
    marginTop: spacing.md,
  },
  sectionTitle: {
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
    alignItems: 'center',
    flex: 2,
    flexDirection: 'row',
    gap: spacing.sm,
    minWidth: 220,
  },
  memberCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  memberName: {
    fontSize: 20,
    fontWeight: '900',
  },
  memberMeta: {
    fontSize: 16,
    fontWeight: '800',
  },
  memberStats: {
    flex: 1,
    gap: spacing.xs,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  statValue: {
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
  flagText: {
    fontSize: 14,
    fontWeight: '900',
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
  coordinateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  coordinateField: {
    flex: 1,
    minWidth: 180,
  },
  multiline: {
    minHeight: 112,
  },
  cardAction: {
    marginTop: spacing.xl,
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
  requestList: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  inviteList: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  inviteCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  inviteCode: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  requestCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  requestCopy: {
    gap: spacing.xs,
  },
  requestProfileCopy: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  requestActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  requestAction: {
    flex: 1,
    minWidth: 150,
  },
  choiceGroup: {
    gap: spacing.sm,
  },
  choiceLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  choiceButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  choiceText: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
