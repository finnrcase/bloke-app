import { Redirect } from 'expo-router';
import { PropsWithChildren } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { LoadingScreen } from '@/components/LoadingScreen';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';

type RouteGuardProps = PropsWithChildren<{
  mode: 'public' | 'onboarding' | 'protected';
}>;

export function RouteGuard({ children, mode }: RouteGuardProps) {
  const { authError, isLoading, isProfileComplete, session } = useAuth();
  const theme = useTheme();

  if (isLoading) {
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

  return children;
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
