import { Redirect } from 'expo-router';
import { PropsWithChildren } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { LoadingScreen } from '@/components/LoadingScreen';
import { spacing } from '@/constants/theme';
import { useAdminState } from '@/context/AdminContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { canCreateChapter, canManageChapter } from '@/lib/permissions';

type RouteGuardProps = PropsWithChildren<{
  mode: 'public' | 'onboarding' | 'protected';
  permission?: 'admin' | 'chapterLeader' | 'manageChapter';
  chapterId?: string | null;
}>;

export function RouteGuard({ children, chapterId, mode, permission }: RouteGuardProps) {
  const { authError, isLoading, isProfileComplete, profile, session } = useAuth();
  const adminState = useAdminState();
  const theme = useTheme();

  if (isLoading || adminState.isLoading) {
    return <LoadingScreen />;
  }

  if (authError) {
    return (
      <AppScreen>
        <AppCard>
          <Text style={[styles.errorTitle, { color: theme.textPrimary }]}>
            Could not check your profile.
          </Text>
          <Text style={[styles.errorBody, { color: theme.textSecondary }]}>{authError}</Text>
        </AppCard>
      </AppScreen>
    );
  }

  if (mode === 'public') {
    if (session && isProfileComplete) {
      return <Redirect href="/home" />;
    }

    if (session) {
      return <Redirect href="/onboarding" />;
    }

    return children;
  }

  if (mode === 'onboarding') {
    if (!session) {
      return <Redirect href="/welcome" />;
    }

    if (isProfileComplete) {
      return <Redirect href="/home" />;
    }

    return children;
  }

  if (!session) {
    return <Redirect href="/welcome" />;
  }

  if (!isProfileComplete) {
    return <Redirect href="/onboarding" />;
  }

  if (permission === 'admin' && !canCreateChapter(profile)) {
    return <Unauthorized message="Only global admins can open this screen." />;
  }

  if (permission === 'chapterLeader' && !adminState.isChapterLeader(chapterId)) {
    return <Unauthorized message="Only chapter leaders can open this screen." />;
  }

  if (permission === 'manageChapter' && !canManageChapter(profile, adminState.leaderMemberships, chapterId)) {
    return <Unauthorized message="You do not have permission to manage this chapter." />;
  }

  return children;
}

function Unauthorized({ message }: { message: string }) {
  const theme = useTheme();

  return (
    <AppScreen>
      <AppCard>
        <Text style={[styles.errorTitle, { color: theme.textPrimary }]}>Unauthorized</Text>
        <Text style={[styles.errorBody, { color: theme.textSecondary }]}>{message}</Text>
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  errorTitle: {
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 31,
    marginBottom: spacing.md,
  },
  errorBody: {
    fontSize: 18,
    lineHeight: 28,
  },
});
