import { ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { enableFreeze } from 'react-native-screens';

import { AppSplash } from '@/components/ui/AppSplash';
import { AdminProvider } from '@/context/AdminContext';
import { AuthProvider } from '@/context/AuthContext';
import { PreferencesProvider } from '@/context/PreferencesContext';
import { useTheme } from '@/hooks/useTheme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

enableFreeze(true);
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return <AppSplash message="Loading Bloke" />;
  }

  return (
    <AuthProvider>
      <AdminProvider>
        <PreferencesProvider>
          <RootStack />
        </PreferencesProvider>
      </AdminProvider>
    </AuthProvider>
  );
}

function RootStack() {
  const theme = useTheme();

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme.colorScheme;
    }
  }, [theme.colorScheme]);

  return (
    <ThemeProvider value={theme.navigationTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.textPrimary,
          headerTitleStyle: { fontWeight: '900' },
          contentStyle: { backgroundColor: theme.background },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="splash" options={{ headerShown: false }} />
        <Stack.Screen name="(public)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="check-in" options={{ headerShown: false }} />
        <Stack.Screen name="chapter/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="chapters" options={{ title: 'Chapter Directory' }} />
        <Stack.Screen name="onboarding" options={{ title: 'Onboarding' }} />
        <Stack.Screen name="facilitator" options={{ title: 'Facilitator' }} />
        <Stack.Screen name="privacy" options={{ title: 'Privacy Policy' }} />
        <Stack.Screen name="terms" options={{ title: 'Terms' }} />
        <Stack.Screen name="support" options={{ title: 'Support' }} />
      </Stack>
    </ThemeProvider>
  );
}
