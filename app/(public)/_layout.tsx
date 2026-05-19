import { Stack } from 'expo-router';

import { RouteGuard } from '@/components/RouteGuard';
import { colors } from '@/constants/theme';

export default function PublicLayout() {
  return (
    <RouteGuard mode="public">
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '900' },
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="welcome" options={{ title: 'Welcome' }} />
        <Stack.Screen name="login" options={{ title: 'Log in' }} />
        <Stack.Screen name="signup" options={{ title: 'Sign up' }} />
      </Stack>
    </RouteGuard>
  );
}
