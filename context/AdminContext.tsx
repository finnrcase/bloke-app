import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { canCreateChapter, canManageChapter, isAdmin, isChapterLeader } from '@/lib/permissions';
import { demoChapterMembers } from '@/lib/demoData';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type ChapterMember = Database['public']['Tables']['chapter_members']['Row'];

type AdminContextValue = {
  errorMessage: string;
  isAdmin: boolean;
  isChapterLeader: (chapterId?: string | null) => boolean;
  isLoading: boolean;
  leaderMemberships: ChapterMember[];
  refreshAdminState: () => Promise<void>;
  canCreateChapter: () => boolean;
  canManageChapter: (chapterId?: string | null) => boolean;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: PropsWithChildren) {
  const { isDemoMode, profile, session } = useAuth();
  const [leaderMemberships, setLeaderMemberships] = useState<ChapterMember[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const refreshAdminState = useCallback(async () => {
    if (!session) {
      setLeaderMemberships([]);
      setErrorMessage('');
      setIsLoading(false);
      return;
    }

    if (isDemoMode) {
      setLeaderMemberships(
        demoChapterMembers.filter((membership) => membership.profile_id === session.user.id || membership.user_id === session.user.id),
      );
      setErrorMessage('');
      setIsLoading(false);
      return;
    }

    if (!supabase) {
      setLeaderMemberships([]);
      setErrorMessage('Supabase is not configured. Add your Expo public Supabase env vars.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase
        .from('chapter_members')
        .select('*')
        .or(`profile_id.eq.${session.user.id},user_id.eq.${session.user.id}`);

      if (error) throw error;
      setLeaderMemberships(data ?? []);
    } catch (error) {
      setLeaderMemberships([]);
      setErrorMessage(error instanceof Error ? error.message : 'Could not load admin permissions.');
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode, session]);

  useEffect(() => {
    refreshAdminState();
  }, [refreshAdminState]);

  const value = useMemo<AdminContextValue>(
    () => ({
      errorMessage,
      isAdmin: isAdmin(profile),
      isChapterLeader: (chapterId) => isChapterLeader(leaderMemberships, chapterId),
      isLoading,
      leaderMemberships,
      refreshAdminState,
      canCreateChapter: () => canCreateChapter(profile),
      canManageChapter: (chapterId) => canManageChapter(profile, leaderMemberships, chapterId),
    }),
    [errorMessage, isLoading, leaderMemberships, profile, refreshAdminState],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdminState() {
  const value = useContext(AdminContext);

  if (!value) {
    throw new Error('useAdminState must be used inside AdminProvider.');
  }

  return value;
}
