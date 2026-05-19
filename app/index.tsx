import { Redirect } from 'expo-router';

import { LoadingScreen } from '@/components/LoadingScreen';
import { useAuth } from '@/context/AuthContext';

export default function IndexScreen() {
  const { isLoading, isProfileComplete, session } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Redirect href="/welcome" />;
  }

  if (!isProfileComplete) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/home" />;
}
