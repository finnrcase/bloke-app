import * as Clipboard from 'expo-clipboard';
import { Copy, MapPin, Plus, ShieldAlert, ShieldCheck, Users } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { AppPressButton } from '@/components/AppPressButton';
import { AppScreen } from '@/components/AppScreen';
import { FormTextInput } from '@/components/FormTextInput';
import { RouteGuard } from '@/components/RouteGuard';
import { EmptyState } from '@/components/ui/EmptyState';
import { GlassCard } from '@/components/ui/GlassCard';
import { HeroSection } from '@/components/ui/HeroSection';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { demoChapter, demoChapterMembers, demoMemberProfiles } from '@/lib/demoData';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Chapter = Database['public']['Tables']['chapters']['Row'];
type ChapterMember = Database['public']['Tables']['chapter_members']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

type ChapterRow = {
  chapter: Chapter;
  facilitator: Profile | null;
  memberCount: number;
};

type ChapterDetailsDraft = {
  country: string;
  description: string;
  isPublic: boolean;
  joinPolicy: 'invite_code' | 'request' | 'open';
  latitude: string;
  longitude: string;
  meetingDay: string;
  meetingLocation: string;
  region: string;
};

function generateInviteCode(existingCodes: Set<string>) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
    const code = `BLOKE-${suffix}`;

    if (!existingCodes.has(code)) {
      return code;
    }
  }

  return `BLOKE-${Date.now().toString(36).toUpperCase()}`;
}

function parseOptionalCoordinate(value: string, label: string) {
  if (!value.trim()) {
    return null;
  }

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

export default function AdminChaptersScreen() {
  const { isDemoMode, profile, session } = useAuth();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [copiedCode, setCopiedCode] = useState('');
  const [country, setCountry] = useState('');
  const [description, setDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [joinPolicy, setJoinPolicy] = useState<'invite_code' | 'request' | 'open'>('invite_code');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [meetingDay, setMeetingDay] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  const isAdmin = profile?.role === 'admin';
  const existingCodes = useMemo(
    () => new Set(chapters.map((row) => row.chapter.invite_code)),
    [chapters],
  );

  const loadChapters = useCallback(async () => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    if (isDemoMode) {
      setChapters([
        {
          chapter: demoChapter,
          facilitator: demoMemberProfiles.find((memberProfile) => memberProfile.id === demoChapter.facilitator_id) ?? null,
          memberCount: demoChapterMembers.length,
        },
      ]);
      setErrorMessage('');
      setIsLoading(false);
      return;
    }

    if (!supabase || !session) {
      setErrorMessage('Supabase is not configured. Add your Expo public Supabase env vars.');
      setIsLoading(false);
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const [chaptersResult, membershipsResult] = await Promise.all([
        supabase.from('chapters').select('*').order('created_at', { ascending: false }),
        supabase.from('chapter_members').select('*'),
      ]);

      if (chaptersResult.error) throw chaptersResult.error;
      if (membershipsResult.error) throw membershipsResult.error;

      const chapterRows = chaptersResult.data ?? [];
      const memberships = (membershipsResult.data ?? []) as ChapterMember[];
      const facilitatorIds = chapterRows
        .map((chapter) => chapter.facilitator_id)
        .filter((id): id is string => Boolean(id));
      let facilitators: Profile[] = [];

      if (facilitatorIds.length > 0) {
        const profilesResult = await supabase
          .from('profiles')
          .select('*')
          .in('id', facilitatorIds);

        if (profilesResult.error) throw profilesResult.error;
        facilitators = profilesResult.data ?? [];
      }

      setChapters(
        chapterRows.map((chapter) => ({
          chapter,
          facilitator: facilitators.find((facilitator) => facilitator.id === chapter.facilitator_id) ?? null,
          memberCount: memberships.filter((membership) => membership.chapter_id === chapter.id).length,
        })),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load chapters.');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, isDemoMode, session]);

  useEffect(() => {
    loadChapters();
  }, [loadChapters]);

  async function copyInviteCode(inviteCode: string) {
    await Clipboard.setStringAsync(inviteCode);
    setCopiedCode(inviteCode);
  }

  async function createChapter() {
    if (!isAdmin) {
      setErrorMessage('Only admins can create chapters.');
      return;
    }

    if (!name.trim() || !country.trim() || !region.trim()) {
      setErrorMessage('Add a chapter name, country, and region or city.');
      return;
    }

    setErrorMessage('');
    setSavedMessage('');
    setIsSaving(true);

    try {
      const nextLatitude = parseOptionalCoordinate(latitude, 'latitude');
      const nextLongitude = parseOptionalCoordinate(longitude, 'longitude');
      let inviteCode = generateInviteCode(existingCodes);

      if (isDemoMode) {
        const demoCreatedChapter: Chapter = {
          country: country.trim(),
          created_at: new Date().toISOString(),
          description: description.trim() || null,
          facilitator_id: null,
          id: `demo-chapter-${Date.now()}`,
          invite_code: inviteCode,
          is_public: isPublic,
          join_policy: joinPolicy,
          latitude: nextLatitude,
          longitude: nextLongitude,
          meeting_day: meetingDay.trim() || null,
          meeting_location: meetingLocation.trim() || null,
          name: name.trim(),
          public_join_enabled: joinPolicy === 'open',
          region: region.trim(),
        };

        setChapters((current) => [
          {
            chapter: demoCreatedChapter,
            facilitator: null,
            memberCount: 0,
          },
          ...current,
        ]);
      } else {
        if (!supabase) {
          throw new Error('Supabase is not configured. Add your Expo public Supabase env vars.');
        }

        const attemptedCodes = new Set(existingCodes);
        let created = false;

        for (let attempt = 0; attempt < 5; attempt += 1) {
          inviteCode = generateInviteCode(attemptedCodes);
          attemptedCodes.add(inviteCode);

          const { error } = await supabase.from('chapters').insert({
            country: country.trim(),
            description: description.trim() || null,
            invite_code: inviteCode,
            is_public: isPublic,
            join_policy: joinPolicy,
            latitude: nextLatitude,
            longitude: nextLongitude,
            meeting_day: meetingDay.trim() || null,
            meeting_location: meetingLocation.trim() || null,
            name: name.trim(),
            public_join_enabled: joinPolicy === 'open',
            region: region.trim(),
          });

          if (!error) {
            created = true;
            break;
          }

          if (error.code !== '23505') {
            throw error;
          }
        }

        if (!created) {
          throw new Error('Could not generate a unique invite code. Try again.');
        }

        await loadChapters();
      }

      setName('');
      setCountry('');
      setDescription('');
      setRegion('');
      setLatitude('');
      setLongitude('');
      setMeetingDay('');
      setMeetingLocation('');
      setIsPublic(true);
      setJoinPolicy('invite_code');
      setCopiedCode(inviteCode);
      await Clipboard.setStringAsync(inviteCode);
      setSavedMessage(`Chapter created. Invite code copied: ${inviteCode}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not create chapter.');
    } finally {
      setIsSaving(false);
    }
  }

  async function updateChapterDetails(chapterId: string, draft: ChapterDetailsDraft) {
    if (!isAdmin) {
      setErrorMessage('Only admins can update chapters.');
      return;
    }

    setErrorMessage('');
    setSavedMessage('');
    setIsSaving(true);

    try {
      const nextLatitude = parseOptionalCoordinate(draft.latitude, 'latitude');
      const nextLongitude = parseOptionalCoordinate(draft.longitude, 'longitude');
      const updates: Database['public']['Tables']['chapters']['Update'] = {
        country: draft.country.trim() || null,
        description: draft.description.trim() || null,
        is_public: draft.isPublic,
        join_policy: draft.joinPolicy,
        latitude: nextLatitude,
        longitude: nextLongitude,
        meeting_day: draft.meetingDay.trim() || null,
        meeting_location: draft.meetingLocation.trim() || null,
        public_join_enabled: draft.joinPolicy === 'open',
        region: draft.region.trim() || null,
      };

      if (isDemoMode) {
        setChapters((current) =>
          current.map((row) =>
            row.chapter.id === chapterId
              ? {
                  ...row,
                  chapter: {
                    ...row.chapter,
                    ...updates,
                  },
                }
              : row,
          ),
        );
      } else {
        if (!supabase) {
          throw new Error('Supabase is not configured. Add your Expo public Supabase env vars.');
        }

        const { error } = await supabase.from('chapters').update(updates).eq('id', chapterId);

        if (error) throw error;
        await loadChapters();
      }

      setSavedMessage('Chapter details saved.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not update chapter.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <RouteGuard mode="protected">
      <AppScreen contentStyle={styles.screenContent} innerStyle={isWide ? styles.wideInner : null}>
        <HeroSection
          eyebrow="Admin"
          icon={ShieldCheck}
          subtitle="Create chapters, generate invite codes, and keep the network organized."
          title="Chapter management"
        />

        {!isAdmin ? (
          <AppCard>
            <EmptyState
              body="Your profile role must be admin to manage chapters."
              icon={ShieldAlert}
              title="Unauthorized"
            />
          </AppCard>
        ) : null}

        {isAdmin ? (
          <>
            <GlassCard>
              <SectionHeader
                icon={Plus}
                title="Create chapter"
                subtitle="Generate a local group and copy its invite code."
              />
              <View style={styles.formGrid}>
                <FormTextInput label="Chapter name" onChangeText={setName} placeholder="Northside Chapter" value={name} />
                <FormTextInput label="Country" onChangeText={setCountry} placeholder="United States" value={country} />
                <FormTextInput label="Region / city" onChangeText={setRegion} placeholder="Chicago" value={region} />
                <FormTextInput
                  inputMode="decimal"
                  keyboardType="decimal-pad"
                  label="Latitude"
                  onChangeText={setLatitude}
                  placeholder="Optional"
                  value={latitude}
                />
                <FormTextInput
                  inputMode="decimal"
                  keyboardType="decimal-pad"
                  label="Longitude"
                  onChangeText={setLongitude}
                  placeholder="Optional"
                  value={longitude}
                />
                <FormTextInput
                  label="Description"
                  multiline
                  onChangeText={setDescription}
                  placeholder="What this chapter is about"
                  style={styles.multiline}
                  textAlignVertical="top"
                  value={description}
                />
                <FormTextInput label="Meeting day" onChangeText={setMeetingDay} placeholder="Tuesday" value={meetingDay} />
                <FormTextInput
                  label="Meeting location"
                  onChangeText={setMeetingLocation}
                  placeholder="Community center"
                  value={meetingLocation}
                />
                <OptionGroup
                  label="Visibility"
                  options={[
                    { label: 'Public', value: 'public' },
                    { label: 'Private', value: 'private' },
                  ]}
                  value={isPublic ? 'public' : 'private'}
                  onChange={(value) => setIsPublic(value === 'public')}
                />
                <OptionGroup
                  label="Join policy"
                  options={[
                    { label: 'Invite code', value: 'invite_code' },
                    { label: 'Request', value: 'request' },
                    { label: 'Open', value: 'open' },
                  ]}
                  value={joinPolicy}
                  onChange={(value) => setJoinPolicy(value as 'invite_code' | 'request' | 'open')}
                />
              </View>
              <AppPressButton
                disabled={isSaving}
                icon={Plus}
                label={isSaving ? 'Creating...' : 'Create chapter'}
                onPress={createChapter}
                variant="accent"
              />
            </GlassCard>

            {errorMessage ? (
              <AppCard>
                <Text style={[styles.error, { color: theme.error }]}>{errorMessage}</Text>
                <View style={styles.cardAction}>
                  <AppPressButton label="Try again" onPress={loadChapters} variant="secondary" />
                </View>
              </AppCard>
            ) : null}

            {savedMessage ? <Text style={[styles.saved, { color: theme.success }]}>{savedMessage}</Text> : null}

            {isLoading ? (
              <AppCard>
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={theme.accent} />
                  <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading chapters...</Text>
                </View>
              </AppCard>
            ) : null}

            {!isLoading && chapters.length === 0 ? (
              <AppCard>
                <EmptyState body="Create the first chapter to generate an invite code." icon={MapPin} title="No chapters yet." />
              </AppCard>
            ) : null}

            {!isLoading && chapters.length > 0 ? (
              <GlassCard>
                <SectionHeader icon={Users} title="All chapters" subtitle={`${chapters.length} total`} />
                <View style={styles.chapterList}>
                  {chapters.map((row) => (
                    <ChapterCard
                      copied={copiedCode === row.chapter.invite_code}
                      disabled={isSaving}
                      key={row.chapter.id}
                      row={row}
                      onCopy={() => copyInviteCode(row.chapter.invite_code)}
                      onSave={(draft) => updateChapterDetails(row.chapter.id, draft)}
                    />
                  ))}
                </View>
              </GlassCard>
            ) : null}
          </>
        ) : null}
      </AppScreen>
    </RouteGuard>
  );
}

function ChapterCard({
  copied,
  disabled,
  onCopy,
  onSave,
  row,
}: {
  copied: boolean;
  disabled: boolean;
  onCopy: () => void;
  onSave: (draft: ChapterDetailsDraft) => void;
  row: ChapterRow;
}) {
  const location = [row.chapter.region, row.chapter.country].filter(Boolean).join(', ') || 'No location set';
  const coordinates =
    row.chapter.latitude !== null && row.chapter.longitude !== null
      ? `${row.chapter.latitude.toFixed(4)}, ${row.chapter.longitude.toFixed(4)}`
      : 'Coordinates optional';
  const theme = useTheme();
  const [country, setCountry] = useState(row.chapter.country ?? '');
  const [description, setDescription] = useState(row.chapter.description ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [isPublic, setIsPublic] = useState(row.chapter.is_public ?? true);
  const [joinPolicy, setJoinPolicy] = useState<'invite_code' | 'request' | 'open'>(row.chapter.join_policy ?? 'invite_code');
  const [latitude, setLatitude] = useState(row.chapter.latitude === null ? '' : String(row.chapter.latitude));
  const [longitude, setLongitude] = useState(row.chapter.longitude === null ? '' : String(row.chapter.longitude));
  const [meetingDay, setMeetingDay] = useState(row.chapter.meeting_day ?? '');
  const [meetingLocation, setMeetingLocation] = useState(row.chapter.meeting_location ?? '');
  const [region, setRegion] = useState(row.chapter.region ?? '');

  useEffect(() => {
    setCountry(row.chapter.country ?? '');
    setDescription(row.chapter.description ?? '');
    setIsPublic(row.chapter.is_public ?? true);
    setJoinPolicy(row.chapter.join_policy ?? 'invite_code');
    setLatitude(row.chapter.latitude === null ? '' : String(row.chapter.latitude));
    setLongitude(row.chapter.longitude === null ? '' : String(row.chapter.longitude));
    setMeetingDay(row.chapter.meeting_day ?? '');
    setMeetingLocation(row.chapter.meeting_location ?? '');
    setRegion(row.chapter.region ?? '');
  }, [row.chapter]);

  return (
    <View style={[styles.chapterCard, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
      <View style={styles.chapterTopRow}>
        <View style={styles.chapterCopy}>
          <Text style={[styles.chapterName, { color: theme.textPrimary }]}>{row.chapter.name}</Text>
          <Text style={[styles.chapterMeta, { color: theme.textSecondary }]}>{location}</Text>
        </View>
        <View
          style={[styles.memberPill, { backgroundColor: theme.accentSurface, borderColor: theme.accentBorder }]}>
          <Users color={theme.accent} size={16} strokeWidth={2.6} />
          <Text style={[styles.memberPillText, { color: theme.textPrimary }]}>{row.memberCount}</Text>
        </View>
      </View>

      <View style={styles.detailGrid}>
        <Detail label="Invite code" value={row.chapter.invite_code} />
        <Detail label="Facilitator" value={row.facilitator?.full_name ?? row.chapter.facilitator_id ?? 'Unassigned'} />
        <Detail label="Coordinates" value={coordinates} />
        <Detail label="Visibility" value={row.chapter.is_public ? 'Public' : 'Private'} />
        <Detail label="Join policy" value={row.chapter.join_policy ?? 'invite_code'} />
        <Detail label="Meeting" value={`${row.chapter.meeting_day ?? 'TBD'} · ${row.chapter.meeting_location ?? 'Location TBD'}`} />
      </View>

      <AppPressButton
        icon={Copy}
        label={copied ? 'Invite Code Copied' : 'Copy Invite Code'}
        onPress={onCopy}
        variant="secondary"
      />
      <AppPressButton
        label={isEditing ? 'Close Editor' : 'Edit Chapter Details'}
        onPress={() => setIsEditing((current) => !current)}
        variant="ghost"
      />

      {isEditing ? (
        <View style={styles.inlineEditor}>
          <FormTextInput label="Country" onChangeText={setCountry} placeholder="United States" value={country} />
          <FormTextInput label="Region / city" onChangeText={setRegion} placeholder="Santa Barbara, CA" value={region} />
          <View style={styles.coordinateRow}>
            <View style={styles.coordinateField}>
              <FormTextInput
                inputMode="decimal"
                keyboardType="decimal-pad"
                label="Latitude"
                onChangeText={setLatitude}
                placeholder="Optional"
                value={latitude}
              />
            </View>
            <View style={styles.coordinateField}>
              <FormTextInput
                inputMode="decimal"
                keyboardType="decimal-pad"
                label="Longitude"
                onChangeText={setLongitude}
                placeholder="Optional"
                value={longitude}
              />
            </View>
          </View>
          <FormTextInput
            label="Description"
            multiline
            onChangeText={setDescription}
            placeholder="What members should know"
            style={styles.multiline}
            textAlignVertical="top"
            value={description}
          />
          <FormTextInput label="Meeting day" onChangeText={setMeetingDay} placeholder="Tuesday" value={meetingDay} />
          <FormTextInput
            label="Meeting location"
            onChangeText={setMeetingLocation}
            placeholder="Community center"
            value={meetingLocation}
          />
          <OptionGroup
            label="Visibility"
            options={[
              { label: 'Public', value: 'public' },
              { label: 'Private', value: 'private' },
            ]}
            value={isPublic ? 'public' : 'private'}
            onChange={(value) => setIsPublic(value === 'public')}
          />
          <OptionGroup
            label="Join policy"
            options={[
              { label: 'Invite code', value: 'invite_code' },
              { label: 'Request', value: 'request' },
              { label: 'Open', value: 'open' },
            ]}
            value={joinPolicy}
            onChange={(value) => setJoinPolicy(value as 'invite_code' | 'request' | 'open')}
          />
          <AppPressButton
            disabled={disabled}
            label={disabled ? 'Saving...' : 'Save Details'}
            onPress={() =>
              onSave({
                country,
                description,
                isPublic,
                joinPolicy,
                latitude,
                longitude,
                meetingDay,
                meetingLocation,
                region,
              })
            }
            variant="accent"
          />
        </View>
      ) : null}
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={styles.detail}>
      <Text style={[styles.detailLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{value}</Text>
    </View>
  );
}

function OptionGroup({
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
    <View style={styles.optionGroup}>
      <Text style={[styles.optionLabel, { color: theme.textPrimary }]}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map((option) => {
          const active = option.value === value;

          return (
            <Pressable
              accessibilityLabel={`${label}: ${option.label}`}
              accessibilityRole="button"
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[
                styles.optionButton,
                {
                  backgroundColor: active ? theme.accent : theme.card,
                  borderColor: active ? theme.accent : theme.border,
                },
              ]}>
              <Text style={[styles.optionText, { color: active ? theme.accentText : theme.textPrimary }]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    justifyContent: 'flex-start',
  },
  wideInner: {
    maxWidth: 1040,
  },
  formGrid: {
    gap: spacing.md,
  },
  multiline: {
    minHeight: 104,
  },
  error: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 25,
  },
  saved: {
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  cardAction: {
    marginTop: spacing.xl,
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '800',
  },
  chapterList: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  chapterCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  inlineEditor: {
    gap: spacing.md,
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
  chapterTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  chapterCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  chapterName: {
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  chapterMeta: {
    fontSize: 16,
    fontWeight: '800',
  },
  memberPill: {
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  memberPillText: {
    fontSize: 15,
    fontWeight: '900',
  },
  detailGrid: {
    gap: spacing.sm,
  },
  detail: {
    gap: spacing.xs,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
  },
  optionGroup: {
    gap: spacing.sm,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
