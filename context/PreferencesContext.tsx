import AsyncStorage from '@react-native-async-storage/async-storage';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { getTranslation, LanguageCode, normalizeLanguage, TranslationKey } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

export type AppearanceMode = 'dark' | 'light' | 'system';

type PreferenceValues = {
  appearance: AppearanceMode;
  language: LanguageCode;
};

type PreferencesContextValue = PreferenceValues & {
  errorMessage: string;
  isSaving: boolean;
  savePreferences: (nextPreferences: Partial<PreferenceValues>) => Promise<void>;
  t: (key: TranslationKey) => string;
};

const LANGUAGE_KEY = 'performance-os-language';
const APPEARANCE_KEY = 'performance-os-appearance';

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function normalizeAppearance(value?: string | null): AppearanceMode {
  if (value === 'light' || value === 'system') {
    return value;
  }

  return 'dark';
}

async function persistLocalPreferences(nextPreferences: PreferenceValues) {
  await Promise.all([
    AsyncStorage.setItem(LANGUAGE_KEY, nextPreferences.language),
    AsyncStorage.setItem(APPEARANCE_KEY, nextPreferences.appearance),
  ]);

  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      window.localStorage.setItem(LANGUAGE_KEY, nextPreferences.language);
      window.localStorage.setItem(APPEARANCE_KEY, nextPreferences.appearance);
    } catch {
      // AsyncStorage remains the durable fallback when browser storage is unavailable.
    }

    document.documentElement.dataset.theme = nextPreferences.appearance;
    document.documentElement.lang = nextPreferences.language;
  }
}

async function loadLocalPreferences(): Promise<Partial<PreferenceValues>> {
  const [storedLanguage, storedAppearance] = await Promise.all([
    AsyncStorage.getItem(LANGUAGE_KEY),
    AsyncStorage.getItem(APPEARANCE_KEY),
  ]);

  return {
    appearance: storedAppearance ? normalizeAppearance(storedAppearance) : undefined,
    language: storedLanguage ? normalizeLanguage(storedLanguage) : undefined,
  };
}

export function PreferencesProvider({ children }: PropsWithChildren) {
  const { isDemoMode, profile, refreshProfile, session } = useAuth();
  const [appearance, setAppearance] = useState<AppearanceMode>('dark');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [language, setLanguage] = useState<LanguageCode>('en');

  useEffect(() => {
    let isMounted = true;

    async function hydratePreferences() {
      const localPreferences = await loadLocalPreferences();
      const nextPreferences: PreferenceValues = {
        appearance: localPreferences.appearance ?? normalizeAppearance(profile?.appearance) ?? 'dark',
        language: localPreferences.language ?? normalizeLanguage(profile?.language) ?? 'en',
      };

      if (!isMounted) {
        return;
      }

      setAppearance(nextPreferences.appearance);
      setLanguage(nextPreferences.language);
      await persistLocalPreferences(nextPreferences);
    }

    hydratePreferences().catch(() => {
      // Preference hydration should never block the app shell.
    });

    return () => {
      isMounted = false;
    };
  }, [profile?.appearance, profile?.language]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      appearance,
      errorMessage,
      isSaving,
      language,
      async savePreferences(nextPreferences) {
        const mergedPreferences: PreferenceValues = {
          appearance: normalizeAppearance(nextPreferences.appearance ?? appearance),
          language: normalizeLanguage(nextPreferences.language ?? language),
        };

        setAppearance(mergedPreferences.appearance);
        setLanguage(mergedPreferences.language);
        setErrorMessage('');
        setIsSaving(true);

        try {
          await persistLocalPreferences(mergedPreferences);

          if (supabase && session && !isDemoMode) {
            const { error } = await supabase
              .from('profiles')
              .update({
                appearance: mergedPreferences.appearance,
                language: mergedPreferences.language,
              })
              .eq('id', session.user.id);

            if (error) {
              throw error;
            }

            await refreshProfile();
          }
        } catch (error) {
          await persistLocalPreferences(mergedPreferences);
          setErrorMessage(
            error instanceof Error
              ? `Saved locally. Supabase sync failed: ${error.message}`
              : 'Saved locally. Supabase sync failed.',
          );
        } finally {
          setIsSaving(false);
        }
      },
      t(key) {
        return getTranslation(language, key);
      },
    }),
    [appearance, errorMessage, isDemoMode, isSaving, language, refreshProfile, session],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const value = useContext(PreferencesContext);

  if (!value) {
    throw new Error('usePreferences must be used inside PreferencesProvider.');
  }

  return value;
}
