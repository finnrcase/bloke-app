import { router } from 'expo-router';
import { Briefcase, Camera, Check, Languages, LogOut, MapPin, Monitor, Moon, Sun, Target, User } from 'lucide-react-native';
import { ComponentType, ReactNode, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppPressButton } from '@/components/AppPressButton';
import { AppScreen } from '@/components/AppScreen';
import { FormTextInput } from '@/components/FormTextInput';
import { GlassCard } from '@/components/ui/GlassCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { AppearanceMode, usePreferences } from '@/context/PreferencesContext';
import { useTheme } from '@/hooks/useTheme';
import { demoProfile, demoProfileDetails } from '@/lib/demoData';
import { LanguageCode } from '@/lib/i18n';
import { pickAndCropProfilePhoto, uploadProfilePhoto } from '@/lib/supabase/profilePhotos';
import {
  ProfileDetail,
  DEFAULT_GOAL_OPTIONS,
  DEFAULT_INTEREST_OPTIONS,
  GoalOption,
  InterestOption,
  getCurrentProfileDetails,
  getCurrentStructuredProfileSelectionIds,
  getStructuredProfileOptions,
  saveCurrentStructuredProfileSelections,
  updateCurrentProfileAvatar,
  upsertCurrentProfile,
  upsertCurrentProfileDetails,
} from '@/lib/supabase/profiles';
import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type OptionValue = AppearanceMode | LanguageCode;

type PreferenceOption = {
  icon?: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  label: string;
  value: OptionValue;
};

type ProfileDraft = {
  avatarUrl: string;
  birthdate: string;
  careerInterests: string;
  city: string;
  firstName: string;
  languagesSpoken: string;
  lastName: string;
  personalAspirations: string;
  state: string;
};

const EMPTY_PROFILE_DRAFT: ProfileDraft = {
  avatarUrl: '',
  birthdate: '',
  careerInterests: '',
  city: '',
  firstName: '',
  languagesSpoken: '',
  lastName: '',
  personalAspirations: '',
  state: '',
};

export default function ProfileScreen() {
  const { isDemoMode, profile, refreshProfile, session, signOut } = useAuth();
  const {
    appearance,
    errorMessage: preferenceError,
    isSaving,
    language,
    savePreferences,
    t,
  } = usePreferences();
  const theme = useTheme();
  const [draftAppearance, setDraftAppearance] = useState<AppearanceMode>(appearance);
  const [draftLanguage, setDraftLanguage] = useState<LanguageCode>(language);
  const [draft, setDraft] = useState<ProfileDraft>(EMPTY_PROFILE_DRAFT);
  const [goalOptions, setGoalOptions] = useState<GoalOption[]>(DEFAULT_GOAL_OPTIONS);
  const [interestOptions, setInterestOptions] = useState<InterestOption[]>(DEFAULT_INTEREST_OPTIONS);
  const [profileDetails, setProfileDetails] = useState<ProfileDetail | null>(null);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([]);
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    setDraftAppearance(appearance);
    setDraftLanguage(language);
  }, [appearance, language]);

  useEffect(() => {
    let isMounted = true;

    async function loadProfileDetails() {
      setProfileError('');
      setSavedMessage('');

      if (!session) {
        setProfileDetails(null);
        setDraft(EMPTY_PROFILE_DRAFT);
        setSelectedGoalIds([]);
        setSelectedInterestIds([]);
        return;
      }

      if (isDemoMode) {
        if (!isMounted) return;
        const nextInterestOptions = DEFAULT_INTEREST_OPTIONS;
        const nextGoalOptions = DEFAULT_GOAL_OPTIONS;
        setProfileDetails(demoProfileDetails);
        setInterestOptions(nextInterestOptions);
        setGoalOptions(nextGoalOptions);
        setSelectedInterestIds(resolveSelectedOptionIds(nextInterestOptions, demoProfileDetails.interests));
        setSelectedGoalIds(resolveSelectedOptionIds(nextGoalOptions, demoProfileDetails.goals));
        setDraft(buildDraftFromProfile(profile ?? demoProfile, demoProfileDetails));
        return;
      }

      const [detailsResult, optionsResult, selectionsResult] = await Promise.all([
        getCurrentProfileDetails(session.user.id),
        getStructuredProfileOptions(),
        getCurrentStructuredProfileSelectionIds(session.user.id),
      ]);

      if (!isMounted) return;

      const data = detailsResult.data;
      const error = detailsResult.error ?? optionsResult.error ?? selectionsResult.error;
      const nextInterestOptions = optionsResult.data.interests;
      const nextGoalOptions = optionsResult.data.goals;
      const nextInterestIds = selectionsResult.data.interestIds.length
        ? selectionsResult.data.interestIds
        : resolveSelectedOptionIds(nextInterestOptions, data?.interests);
      const nextGoalIds = selectionsResult.data.goalIds.length
        ? selectionsResult.data.goalIds
        : resolveSelectedOptionIds(nextGoalOptions, data?.goals);

      if (error) {
        setProfileError(error);
      }

      setGoalOptions(nextGoalOptions);
      setInterestOptions(nextInterestOptions);
      setProfileDetails(data);
      setSelectedGoalIds(nextGoalIds);
      setSelectedInterestIds(nextInterestIds);
      setDraft(buildDraftFromProfile(profile, data));
    }

    loadProfileDetails();

    return () => {
      isMounted = false;
    };
  }, [isDemoMode, profile, session]);

  const completionItems = useMemo(
    () => [
      { done: Boolean(draft.firstName.trim() && draft.lastName.trim()), label: 'Name' },
      { done: Boolean(draft.avatarUrl.trim()), label: 'Photo' },
      { done: Boolean(draft.birthdate.trim()), label: 'Birthdate' },
      { done: Boolean(draft.city.trim() && draft.state.trim()), label: 'Location' },
      { done: parseTagList(draft.languagesSpoken).length > 0, label: 'Languages' },
      { done: selectedInterestIds.length > 0, label: 'Interests' },
      { done: selectedGoalIds.length > 0, label: 'Goals' },
      { done: parseTagList(draft.careerInterests).length > 0, label: 'Career' },
      { done: Boolean(draft.personalAspirations.trim()), label: 'Aspirations' },
    ],
    [draft, selectedGoalIds.length, selectedInterestIds.length],
  );
  const completeCount = completionItems.filter((item) => item.done).length;
  const completionRatio = completionItems.length > 0 ? completeCount / completionItems.length : 0;
  const completionPercent = Math.round(completionRatio * 100);
  const displayName = normalizeText([draft.firstName, draft.lastName].filter(Boolean).join(' ')) ?? profile?.full_name ?? session?.user.email ?? 'Bloke member';

  function updateDraft(field: keyof ProfileDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setSavedMessage('');
  }

  function toggleInterest(id: string) {
    setSavedMessage('');
    setProfileError('');
    setSelectedInterestIds((current) => toggleCappedSelection(current, id, 5, () => setProfileError('Select up to 5 interests.')));
  }

  function toggleGoal(id: string) {
    setSavedMessage('');
    setProfileError('');
    setSelectedGoalIds((current) => toggleCappedSelection(current, id, 5, () => setProfileError('Select up to 5 goals.')));
  }

  async function handleLogout() {
    setIsSigningOut(true);
    setErrorMessage('');

    try {
      await signOut();
      router.replace('/welcome');
    } catch {
      setErrorMessage('Could not log out. Try again.');
    } finally {
      setIsSigningOut(false);
    }
  }

  async function handleSavePreferences() {
    await savePreferences({
      appearance: draftAppearance,
      language: draftLanguage,
    });
  }

  async function handleUploadProfilePhoto() {
    setProfileError('');
    setSavedMessage('');

    if (!session) {
      setProfileError('Sign in before uploading a profile photo.');
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const photo = await pickAndCropProfilePhoto();

      if (!photo) {
        return;
      }

      if (isDemoMode) {
        setDraft((current) => ({ ...current, avatarUrl: photo.uri }));
        setSavedMessage('Profile photo ready.');
        return;
      }

      const { data: publicUrl, error: uploadError } = await uploadProfilePhoto(session.user.id, photo.uri);

      if (uploadError || !publicUrl) {
        throw new Error(uploadError ?? 'Could not upload profile image.');
      }

      const { error: profileUpdateError } = await updateCurrentProfileAvatar(session.user.id, publicUrl);

      if (profileUpdateError) {
        throw new Error(profileUpdateError);
      }

      setDraft((current) => ({ ...current, avatarUrl: publicUrl }));
      await refreshProfile();
      setSavedMessage('Profile photo updated.');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Could not upload profile photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function handleSaveProfile() {
    setProfileError('');
    setSavedMessage('');

    if (!session) {
      setProfileError('Sign in before editing your profile.');
      return;
    }

    const avatarUrl = normalizeText(draft.avatarUrl);
    const birthdate = normalizeText(draft.birthdate);

    if (avatarUrl && !isDemoMode && !isValidHttpUrl(avatarUrl)) {
      setProfileError('Upload your profile picture before saving.');
      return;
    }

    if (birthdate && !isValidDateValue(birthdate)) {
      setProfileError('Use a valid birthdate in YYYY-MM-DD format.');
      return;
    }

    const selectedInterestLabels = getSelectedOptionLabels(interestOptions, selectedInterestIds);
    const selectedGoalLabels = getSelectedOptionLabels(goalOptions, selectedGoalIds);
    const nextDetails: ProfileDetail = {
      career_interests: parseTagList(draft.careerInterests, 16),
      created_at: profileDetails?.created_at ?? new Date().toISOString(),
      goals: selectedGoalLabels,
      interests: selectedInterestLabels,
      languages_spoken: parseTagList(draft.languagesSpoken, 12),
      personal_aspirations: normalizeText(draft.personalAspirations),
      profile_id: session.user.id,
      updated_at: new Date().toISOString(),
    };

    setIsProfileSaving(true);

    try {
      if (isDemoMode) {
        setProfileDetails(nextDetails);
        setSavedMessage('Profile saved.');
        return;
      }

      const firstName = normalizeText(draft.firstName);
      const lastName = normalizeText(draft.lastName);
      const fullName = normalizeText([firstName, lastName].filter(Boolean).join(' '));

      const { error: profileSaveError } = await upsertCurrentProfile({
        avatar_url: avatarUrl,
        birthdate,
        city: normalizeText(draft.city),
        first_name: firstName,
        full_name: fullName,
        id: session.user.id,
        last_name: lastName,
        personal_goal: selectedGoalLabels[0] ?? null,
        state: normalizeText(draft.state),
      });

      if (profileSaveError) {
        throw new Error(profileSaveError);
      }

      const { data, error: detailsSaveError } = await upsertCurrentProfileDetails(nextDetails);

      if (detailsSaveError) {
        throw new Error(detailsSaveError);
      }

      const { error: selectionsSaveError } = await saveCurrentStructuredProfileSelections(selectedInterestIds, selectedGoalIds);

      if (selectionsSaveError) {
        throw new Error(selectionsSaveError);
      }

      setProfileDetails(data);
      await refreshProfile();
      setSavedMessage('Profile saved.');
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Could not save profile.');
    } finally {
      setIsProfileSaving(false);
    }
  }

  return (
    <AppScreen innerStyle={styles.screenInner}>
      <GlassCard>
        <SectionHeader
          eyebrow="Member profile"
          icon={User}
          title="Build your profile"
          subtitle="Your story, location, goals, and interests in one place."
        />

        <View style={styles.profileTop}>
          <UserAvatar imageUrl={draft.avatarUrl} name={displayName} size={124} />

          <View style={[styles.completionPanel, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
            <View style={styles.completionHeader}>
              <Text style={[styles.completionTitle, { color: theme.textPrimary }]}>Completion</Text>
              <Text style={[styles.completionValue, { color: theme.accent }]}>{completionPercent}%</Text>
            </View>
            <ProgressBar label={`${completeCount} of ${completionItems.length} complete`} value={completionRatio} />
            <View style={styles.completionChips}>
              {completionItems.map((item) => (
                <View
                  key={item.label}
                  style={[
                    styles.completionChip,
                    {
                      backgroundColor: item.done ? theme.accentSurface : theme.card,
                      borderColor: item.done ? theme.accentBorder : theme.border,
                    },
                  ]}>
                  <Text style={[styles.completionChipText, { color: item.done ? theme.accentText : theme.textMuted }]}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <ProfileSection icon={User} title="Identity">
          <View style={[styles.photoPanel, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
            <View style={styles.photoCopy}>
              <Text style={[styles.photoTitle, { color: theme.textPrimary }]}>Profile photo</Text>
              <Text style={[styles.photoBody, { color: theme.textSecondary }]}>
                Choose a square image for your profile, posts, chapter lists, and messages.
              </Text>
            </View>
            <View style={styles.photoAction}>
              <AppPressButton
                disabled={isUploadingPhoto}
                icon={Camera}
                label={isUploadingPhoto ? 'Uploading...' : 'Upload photo'}
                onPress={handleUploadProfilePhoto}
                variant="secondary"
              />
            </View>
          </View>
          <View style={styles.fieldRow}>
            <View style={styles.fieldColumn}>
              <FormTextInput
                autoComplete="given-name"
                label="First name"
                onChangeText={(value) => updateDraft('firstName', value)}
                placeholder="Marcus"
                value={draft.firstName}
              />
            </View>
            <View style={styles.fieldColumn}>
              <FormTextInput
                autoComplete="family-name"
                label="Last name"
                onChangeText={(value) => updateDraft('lastName', value)}
                placeholder="Reed"
                value={draft.lastName}
              />
            </View>
          </View>
          <FormTextInput
            label="Birthdate"
            onChangeText={(value) => updateDraft('birthdate', value)}
            placeholder="YYYY-MM-DD"
            value={draft.birthdate}
          />
        </ProfileSection>

        <ProfileSection icon={MapPin} title="Background">
          <View style={styles.fieldRow}>
            <View style={styles.fieldColumn}>
              <FormTextInput
                label="City"
                onChangeText={(value) => updateDraft('city', value)}
                placeholder="Santa Barbara"
                value={draft.city}
              />
            </View>
            <View style={styles.fieldColumn}>
              <FormTextInput
                autoCapitalize="characters"
                label="State"
                onChangeText={(value) => updateDraft('state', value)}
                placeholder="CA"
                value={draft.state}
              />
            </View>
          </View>
          <FormTextInput
            label="Languages spoken"
            onChangeText={(value) => updateDraft('languagesSpoken', value)}
            placeholder="English, Spanish"
            value={draft.languagesSpoken}
          />
        </ProfileSection>

        <ProfileSection icon={Target} title="Connection signals">
          <MultiSelectField
            label="Interests"
            limit={5}
            onToggle={toggleInterest}
            options={interestOptions}
            selectedIds={selectedInterestIds}
          />
          <MultiSelectField
            label="Goals"
            limit={5}
            onToggle={toggleGoal}
            options={goalOptions}
            selectedIds={selectedGoalIds}
          />
        </ProfileSection>

        <ProfileSection icon={Briefcase} title="Direction">
          <FormTextInput
            label="Career interests"
            onChangeText={(value) => updateDraft('careerInterests', value)}
            placeholder="Trades, technology, coaching"
            value={draft.careerInterests}
          />
          <FormTextInput
            label="Personal dreams and aspirations"
            multiline
            onChangeText={(value) => updateDraft('personalAspirations', value)}
            placeholder="What are you building toward?"
            style={styles.multiline}
            textAlignVertical="top"
            value={draft.personalAspirations}
          />
        </ProfileSection>

        {profileError ? <Text style={[styles.error, { color: theme.error }]}>{profileError}</Text> : null}
        {savedMessage ? <Text style={[styles.saved, { color: theme.success }]}>{savedMessage}</Text> : null}

        <View style={styles.actions}>
          <AppPressButton
            disabled={isProfileSaving || isUploadingPhoto}
            icon={Camera}
            label={isProfileSaving ? 'Saving...' : 'Save profile'}
            onPress={handleSaveProfile}
            variant="accent"
          />
        </View>
      </GlassCard>

      <GlassCard>
        <SectionHeader eyebrow={t('preferences')} icon={Languages} title={t('preferencesIntro')} />

        <View style={styles.preferenceGroup}>
          <Text style={[styles.preferenceLabel, { color: theme.textPrimary }]}>{t('appearance')}</Text>
          <SegmentedControl
            options={[
              { icon: Moon, label: t('dark'), value: 'dark' },
              { icon: Sun, label: t('light'), value: 'light' },
              { icon: Monitor, label: t('system'), value: 'system' },
            ]}
            selectedValue={draftAppearance}
            onChange={(value) => setDraftAppearance(value as AppearanceMode)}
          />
        </View>

        <View style={styles.preferenceGroup}>
          <Text style={[styles.preferenceLabel, { color: theme.textPrimary }]}>{t('language')}</Text>
          <SegmentedControl
            options={[
              { label: t('english'), value: 'en' },
              { label: t('spanish'), value: 'es' },
            ]}
            selectedValue={draftLanguage}
            onChange={(value) => setDraftLanguage(value as LanguageCode)}
          />
        </View>

        {preferenceError ? <Text style={[styles.error, { color: theme.warning }]}>{preferenceError}</Text> : null}

        <View style={styles.actions}>
          <AppPressButton
            disabled={isSaving}
            icon={Check}
            label={isSaving ? t('saving') : t('save')}
            onPress={handleSavePreferences}
            variant="accent"
          />
        </View>
      </GlassCard>

      <GlassCard>
        {errorMessage ? <Text style={[styles.error, { color: theme.error }]}>{errorMessage}</Text> : null}

        <View style={styles.actions}>
          <AppPressButton
            disabled={isSigningOut}
            icon={LogOut}
            label={isSigningOut ? t('loggingOut') : t('logout')}
            onPress={handleLogout}
            variant="secondary"
          />
        </View>
      </GlassCard>
    </AppScreen>
  );
}

function ProfileSection({
  children,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  title: string;
}) {
  const theme = useTheme();

  return (
    <View style={styles.profileSection}>
      <View style={styles.profileSectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: theme.accentSurface, borderColor: theme.accentBorder }]}>
          <Icon color={theme.accentText} size={18} strokeWidth={2.5} />
        </View>
        <Text style={[styles.profileSectionTitle, { color: theme.textPrimary }]}>{title}</Text>
      </View>
      <View style={styles.sectionFields}>{children}</View>
    </View>
  );
}

function MultiSelectField({
  label,
  limit,
  onToggle,
  options,
  selectedIds,
}: {
  label: string;
  limit: number;
  onToggle: (id: string) => void;
  options: Array<InterestOption | GoalOption>;
  selectedIds: string[];
}) {
  const theme = useTheme();

  return (
    <View style={styles.multiSelectField}>
      <View style={styles.multiSelectHeader}>
        <Text style={[styles.preferenceLabel, { color: theme.textPrimary }]}>{label}</Text>
        <Text style={[styles.selectionCount, { color: theme.textMuted }]}>
          {selectedIds.length}/{limit}
        </Text>
      </View>

      <View style={styles.optionGrid}>
        {options.map((option) => {
          const selected = selectedIds.includes(option.id);
          const disabled = !selected && selectedIds.length >= limit;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled, selected }}
              disabled={disabled}
              key={option.id}
              onPress={() => onToggle(option.id)}
              style={[
                styles.optionChip,
                {
                  backgroundColor: selected ? theme.cardInverted : theme.cardMuted,
                  borderColor: selected ? theme.accentBorder : theme.border,
                  opacity: disabled ? 0.5 : 1,
                },
              ]}>
              <Text style={[styles.optionChipText, { color: selected ? theme.textInverse : theme.textPrimary }]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SegmentedControl({
  onChange,
  options,
  selectedValue,
}: {
  onChange: (value: OptionValue) => void;
  options: PreferenceOption[];
  selectedValue: OptionValue;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.segmentedControl, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
      {options.map((option) => {
        const selected = selectedValue === option.value;
        const Icon = option.icon;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && { backgroundColor: theme.cardInverted }]}>
            {Icon ? (
              <Icon
                color={selected ? theme.textInverse : theme.textPrimary}
                size={18}
                strokeWidth={2.5}
              />
            ) : null}
            <Text
              style={[
                styles.segmentLabel,
                { color: selected ? theme.textInverse : theme.textPrimary },
              ]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function buildDraftFromProfile(profile: Profile | null, details: ProfileDetail | null): ProfileDraft {
  return {
    avatarUrl: profile?.avatar_url ?? '',
    birthdate: profile?.birthdate ?? '',
    careerInterests: joinTags(details?.career_interests),
    city: profile?.city ?? '',
    firstName: profile?.first_name ?? getNamePart(profile?.full_name, 'first'),
    languagesSpoken: joinTags(details?.languages_spoken ?? (profile?.language ? [profile.language] : [])),
    lastName: profile?.last_name ?? getNamePart(profile?.full_name, 'last'),
    personalAspirations: details?.personal_aspirations ?? '',
    state: profile?.state ?? '',
  };
}

function getNamePart(fullName: string | null | undefined, part: 'first' | 'last') {
  const trimmed = fullName?.trim();
  if (!trimmed) return '';
  const [first, ...rest] = trimmed.split(/\s+/);
  return part === 'first' ? first : rest.join(' ');
}

function normalizeText(value: string) {
  return value.trim() || null;
}

function parseTagList(value: string, maxItems = 24) {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const rawPart of value.split(',')) {
    const tag = rawPart.trim().replace(/\s+/g, ' ');
    const key = tag.toLocaleLowerCase();

    if (!tag || seen.has(key)) continue;

    seen.add(key);
    tags.push(tag);

    if (tags.length >= maxItems) break;
  }

  return tags;
}

function joinTags(tags?: string[] | null) {
  return (tags ?? []).filter(Boolean).join(', ');
}

function resolveSelectedOptionIds(options: Array<InterestOption | GoalOption>, labels?: string[] | null) {
  const labelSet = new Set((labels ?? []).map((label) => label.trim().toLocaleLowerCase()).filter(Boolean));
  return options.filter((option) => labelSet.has(option.label.toLocaleLowerCase()) || labelSet.has(option.id)).map((option) => option.id).slice(0, 5);
}

function getSelectedOptionLabels(options: Array<InterestOption | GoalOption>, selectedIds: string[]) {
  const selectedIdSet = new Set(selectedIds);
  return options.filter((option) => selectedIdSet.has(option.id)).map((option) => option.label);
}

function toggleCappedSelection(current: string[], id: string, limit: number, onLimit: () => void) {
  if (current.includes(id)) {
    return current.filter((selectedId) => selectedId !== id);
  }

  if (current.length >= limit) {
    onLimit();
    return current;
  }

  return [...current, id];
}

function isValidHttpUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;

  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidDateValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && date <= new Date();
}

const styles = StyleSheet.create({
  screenInner: {
    maxWidth: 820,
  },
  profileTop: {
    alignItems: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  completionPanel: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flex: 1,
    gap: spacing.md,
    minWidth: 240,
    padding: spacing.md,
  },
  completionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  completionTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  completionValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  completionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  completionChip: {
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  completionChipText: {
    fontSize: 13,
    fontWeight: '900',
  },
  profileSection: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  profileSectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sectionIcon: {
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  profileSectionTitle: {
    fontSize: typography.bodyLarge,
    fontWeight: '900',
  },
  sectionFields: {
    gap: spacing.md,
  },
  photoPanel: {
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  photoCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 220,
  },
  photoTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  photoBody: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  photoAction: {
    minWidth: 170,
  },
  fieldRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  fieldColumn: {
    flex: 1,
    minWidth: 220,
  },
  preferenceGroup: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '900',
  },
  multiSelectField: {
    gap: spacing.sm,
  },
  multiSelectHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectionCount: {
    fontSize: 14,
    fontWeight: '900',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionChip: {
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionChipText: {
    fontSize: 15,
    fontWeight: '900',
  },
  segmentedControl: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  segment: {
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 54,
    minWidth: 110,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  segmentLabel: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  multiline: {
    minHeight: 132,
  },
  error: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.lg,
  },
  saved: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: spacing.lg,
  },
  actions: {
    marginTop: spacing.xl,
  },
});
