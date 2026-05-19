import { Session } from '@supabase/supabase-js';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';

import { signOutUser } from '@/lib/auth';
import { demoProfile, demoSession } from '@/lib/demoData';
import { env } from '@/lib/env';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

type AuthContextValue = {
  authError: string;
  isConfigured: boolean;
  isDemoMode: boolean;
  isLoading: boolean;
  isProfileComplete: boolean;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  session: Session | null;
  signOut: () => Promise<void>;
  startDemo: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(!env.isDemoMode && isSupabaseConfigured);

  async function loadProfile(nextSession: Session | null) {
    if (!supabase || !nextSession) {
      setProfile(null);
      return;
    }

    setAuthError('');

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', nextSession.user.id)
      .maybeSingle();

    if (error) {
      setProfile(null);
      setAuthError(error.message);
      throw error;
    }

    setProfile(data);
  }

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) {
        return;
      }

      setSession(data.session);

      try {
        await loadProfile(data.session);
      } catch {
        // Auth errors are surfaced through authError while the app stays renderable.
      } finally {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      loadProfile(nextSession)
        .catch(() => {
          // Keep routing stable even when profile fetch fails.
        })
        .finally(() => setIsLoading(false));
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      authError,
      isConfigured: env.isDemoMode || isSupabaseConfigured,
      isDemoMode: env.isDemoMode,
      isLoading,
      isProfileComplete: profile?.onboarding_complete === true,
      profile,
      async refreshProfile() {
        if (env.isDemoMode) {
          setProfile(session ? demoProfile : null);
          return;
        }

        try {
          await loadProfile(session);
        } catch {
          // The latest profile error is stored in authError.
        }
      },
      session,
      async signOut() {
        if (env.isDemoMode) {
          setProfile(null);
          setSession(null);
          setAuthError('');
          return;
        }

        const { error } = await signOutUser();

        if (error) {
          throw new Error(error);
        }

        setProfile(null);
        setSession(null);
      },
      startDemo() {
        setAuthError('');
        setProfile(demoProfile);
        setSession(demoSession);
        setIsLoading(false);
      },
    }),
    [authError, isLoading, profile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return value;
}
