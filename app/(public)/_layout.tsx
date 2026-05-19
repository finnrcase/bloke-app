import { Stack } from 'expo-router';

import { RouteGuard } from '@/components/RouteGuard';
import { useTheme } from '@/hooks/useTheme';

export default function PublicLayout() {
  const theme = useTheme();

  return (
    <RouteGuard mode="public">
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.textPrimary,
          headerTitleStyle: { fontWeight: '900' },
          contentStyle: { backgroundColor: theme.background },
        }}>
        <Stack.Screen name="welcome" options={{ title: 'Welcome' }} />
        <Stack.Screen name="login" options={{ title: 'Log in' }} />
        <Stack.Screen name="signup" options={{ title: 'Sign up' }} />
      </Stack>
    </RouteGuard>
  );
}
