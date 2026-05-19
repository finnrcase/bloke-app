import { router } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { AppPressButton } from '@/components/AppPressButton';
import { AppScreen } from '@/components/AppScreen';
import { FormTextInput } from '@/components/FormTextInput';
import { RouteGuard } from '@/components/RouteGuard';
import { GlassCard } from '@/components/ui/GlassCard';
import { spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { usePreferences } from '@/context/PreferencesContext';
import { useTheme } from '@/hooks/useTheme';
import { normalizeLanguage } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

export default function OnboardingScreen() {
  const { refreshProfile, session } = useAuth();
  const { t } = usePreferences();
  const theme = useTheme();
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

    const normalizedLanguage = normalizeLanguage(language);

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
        appearance: 'dark',
        language: normalizedLanguage,
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
        <GlassCard>
          <Text style={[styles.eyebrow, { color: theme.accent }]}>FIRST STEP</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Set up your profile</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
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
            <View style={styles.languageField}>
              <Text style={[styles.inputLabel, { color: theme.textPrimary }]}>{t('language')}</Text>
              <View style={[styles.languageOptions, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
                {[
                  { label: t('english'), value: 'en' },
                  { label: t('spanish'), value: 'es' },
                ].map((option) => {
                  const selected = normalizeLanguage(language) === option.value;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={option.value}
                      onPress={() => setLanguage(option.value)}
                      style={[styles.languageOption, selected && { backgroundColor: theme.cardInverted }]}>
                      <Text
                        style={[
                          styles.languageOptionText,
                          { color: selected ? theme.textInverse : theme.textPrimary },
                        ]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
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

          {errorMessage ? <Text style={[styles.error, { color: theme.error }]}>{errorMessage}</Text> : null}

          <View style={styles.actions}>
            <AppPressButton
              disabled={isSaving}
              icon={CheckCircle2}
              label={isSaving ? 'Saving...' : 'Submit'}
              onPress={handleSubmit}
            />
          </View>
        </GlassCard>
      </AppScreen>
    </RouteGuard>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: typography.eyebrow,
    fontWeight: '900',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: typography.titleLarge,
    fontWeight: '900',
    lineHeight: 46,
  },
  body: {
    fontSize: 18,
    lineHeight: 28,
    marginTop: spacing.sm,
  },
  form: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  languageField: {
    gap: spacing.sm,
  },
  languageOptions: {
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  languageOption: {
    alignItems: 'center',
    borderRadius: 22,
    flex: 1,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  languageOptionText: {
    fontSize: 16,
    fontWeight: '900',
  },
  multiline: {
    minHeight: 104,
  },
  error: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.lg,
  },
  actions: {
    marginTop: spacing.xl,
  },
});
