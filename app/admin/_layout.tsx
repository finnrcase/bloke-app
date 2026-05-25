import { Redirect, Stack } from 'expo-router';

import { LoadingScreen } from '@/components/LoadingScreen';
import { useAuth } from '@/context/AuthContext';
import { canAccessAdmin } from '@/lib/permissions';

export default function AdminLayout() {
  const { isLoading, profile, session } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Redirect href="/welcome" />;
  }

  if (!canAccessAdmin(profile)) {
    return <Redirect href="/home" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Admin',
      }}>
      <Stack.Screen name="index" options={{ title: 'Admin' }} />
      <Stack.Screen name="chapters" options={{ title: 'Chapters' }} />
      <Stack.Screen name="codes" options={{ title: 'Invite Codes' }} />
      <Stack.Screen name="roles" options={{ title: 'Roles' }} />
      <Stack.Screen name="stats" options={{ title: 'Stats' }} />
    </Stack>
  );
}
