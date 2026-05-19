import { router } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { AppPressButton } from '@/components/AppPressButton';
import { AppScreen } from '@/components/AppScreen';
import { FormTextInput } from '@/components/FormTextInput';
import { RouteGuard } from '@/components/RouteGuard';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function OnboardingScreen() {
  const { refreshProfile, session } = useAuth();
  const [age, setAge] = useState('');
  const [country, setCountry] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [language, setLanguage] = useState('en');
  const [personalGoal, setPersonalGoal] = useState('');

  async function handleSubmit() {
    setErrorMessage('');

    if (!supabase) {
      setErrorMessage('Supabase is not configured. Add your Expo public Supabase env vars.');
      return;
    }

    if (!session) {
      setErrorMessage('You need to be logged in before onboarding.');
      return;
    }

    const parsedAge = Number.parseInt(age, 10);

    if (!fullName.trim() || !age.trim() || !country.trim() || !language.trim() || !personalGoal.trim()) {
      setErrorMessage('Fill in your name, age, country, language, and goal.');
      return;
    }

    if (!Number.isInteger(parsedAge) || parsedAge <= 0) {
      setErrorMessage('Enter a valid age.');
      return;
    }

    setIsSaving(true);

    try {
      const { error: profileError } = await supabase.from('profiles').upsert({
        age: parsedAge,
        country: country.trim(),
        full_name: fullName.trim(),
        id: session.user.id,
        language: language.trim().toLowerCase(),
        onboarding_complete: true,
        personal_goal: personalGoal.trim(),
        role: 'participant',
      });

      if (profileError) {
        throw profileError;
      }

      if (inviteCode.trim()) {
        const { error: inviteError } = await supabase.rpc('join_chapter_by_invite_code', {
          target_invite_code: inviteCode.trim(),
        });

        if (inviteError) {
          throw inviteError;
        }
      }

      // The profile upsert above already set onboarding_complete; just resync.
      await refreshProfile();
      router.replace('/home');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not complete onboarding.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <RouteGuard mode="onboarding">
      <AppScreen>
        <AppCard>
          <Text style={styles.eyebrow}>FIRST STEP</Text>
          <Text style={styles.title}>Set up your profile</Text>
          <Text style={styles.body}>
            A few details help connect you to the right path, chapter, and first goal.
          </Text>

          <View style={styles.form}>
            <FormTextInput
              autoComplete="name"
              label="Full name"
              onChangeText={setFullName}
              placeholder="Your name"
              value={fullName}
            />
            <FormTextInput
              inputMode="numeric"
              keyboardType="number-pad"
              label="Age"
              onChangeText={setAge}
              placeholder="18"
              value={age}
            />
            <FormTextInput
              autoComplete="country"
              label="Country"
              onChangeText={setCountry}
              placeholder="United States"
              value={country}
            />
            <FormTextInput
              autoCapitalize="none"
              label="Preferred language"
              onChangeText={setLanguage}
              placeholder="en"
              value={language}
            />
            <FormTextInput
              autoCapitalize="characters"
              label="Chapter invite code"
              onChangeText={setInviteCode}
              placeholder="Optional"
              value={inviteCode}
            />
            <FormTextInput
              label="Personal goal"
              multiline
              onChangeText={setPersonalGoal}
              placeholder="What do you want to build?"
              style={styles.multiline}
              textAlignVertical="top"
              value={personalGoal}
            />
          </View>

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          <View style={styles.actions}>
            <AppPressButton
              disabled={isSaving}
              icon={CheckCircle2}
              label={isSaving ? 'Saving...' : 'Submit'}
              onPress={handleSubmit}
            />
          </View>
        </AppCard>
      </AppScreen>
    </RouteGuard>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: colors.gold,
    fontSize: typography.eyebrow,
    fontWeight: '900',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: typography.titleLarge,
    fontWeight: '900',
    lineHeight: 46,
  },
  body: {
    color: colors.mutedText,
    fontSize: 18,
    lineHeight: 28,
    marginTop: spacing.sm,
  },
  form: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  multiline: {
    minHeight: 104,
  },
  error: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.lg,
  },
  actions: {
    marginTop: spacing.xl,
  },
});
