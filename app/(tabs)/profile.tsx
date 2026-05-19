import { router } from 'expo-router';
import { Check, Languages, LogOut, Monitor, Moon, Sun, User } from 'lucide-react-native';
import { ComponentType, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppPressButton } from '@/components/AppPressButton';
import { AppScreen } from '@/components/AppScreen';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { AppearanceMode, usePreferences } from '@/context/PreferencesContext';
import { useTheme } from '@/hooks/useTheme';
import { LanguageCode } from '@/lib/i18n';

type OptionValue = AppearanceMode | LanguageCode;

type PreferenceOption = {
  icon?: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  label: string;
  value: OptionValue;
};

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
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
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setDraftAppearance(appearance);
    setDraftLanguage(language);
  }, [appearance, language]);

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

  return (
    <AppScreen>
      <GlassCard>
        <SectionHeader
          eyebrow={t('profile')}
          icon={User}
          title={t('personalDetails')}
        />
        <Text style={[styles.body, { color: theme.textSecondary }]}>{t('accountSettingsIntro')}</Text>

        <View style={[styles.metaBox, { backgroundColor: theme.cardMuted }]}>
          <Text style={[styles.metaLabel, { color: theme.textMuted }]}>{t('signedInAs')}</Text>
          <Text style={[styles.metaValue, { color: theme.textPrimary }]}>{session?.user.email ?? 'Supabase user'}</Text>
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

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: typography.titleLarge,
    fontWeight: '900',
    lineHeight: 46,
  },
  body: {
    fontSize: 19,
    lineHeight: 29,
    marginTop: spacing.md,
  },
  preferenceGroup: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '900',
  },
  segmentedControl: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    flexDirection: 'row',
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  segmentLabel: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  metaBox: {
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    marginTop: spacing.xl,
    padding: spacing.md,
  },
  metaLabel: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 17,
    fontWeight: '700',
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
