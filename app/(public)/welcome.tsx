import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Compass, LogIn, UserPlus } from 'lucide-react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppPressButton } from '@/components/AppPressButton';
import { AppScreen } from '@/components/AppScreen';
import { GradientCard } from '@/components/ui/GradientCard';
import { borderRadius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { env } from '@/lib/env';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function WelcomeScreen() {
  const { startDemo } = useAuth();
  const theme = useTheme();

  function handleDemoLogin() {
    startDemo();
    router.replace('/home');
  }

  return (
    <AppScreen>
      {!env.isDemoMode && !isSupabaseConfigured ? (
        <AppCard>
          <Text style={[styles.noticeTitle, { color: theme.textPrimary }]}>Supabase is not configured.</Text>
          <Text style={[styles.noticeBody, { color: theme.textSecondary }]}>
            Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file, or set
            EXPO_PUBLIC_DEMO_MODE=true for a local demo.
          </Text>
        </AppCard>
      ) : null}

      <GradientCard glow style={styles.heroCard} variant="dark">
        <View style={[styles.brandMark, { backgroundColor: theme.accent }]}>
          <Text style={[styles.brandMarkText, { color: theme.accentText }]}>B</Text>
        </View>
        <Text style={[styles.logo, { color: theme.textInverse }]}>BLOKE</Text>
        <Text style={[styles.subtitle, { color: theme.accent }]}>Learn. Act. Log.</Text>
        <Text style={[styles.description, { color: theme.textInverseMuted }]}>
          A simple path for young men to build discipline, purpose, and brotherhood.
        </Text>

        <View style={styles.actions}>
          {env.isDemoMode ? (
            <AppPressButton icon={Compass} label="Continue Demo" onPress={handleDemoLogin} variant="accent" />
          ) : null}
          <AppButton href="/signup" icon={UserPlus} label="Create Account" variant="accent" />
          <AppButton href="/login" icon={LogIn} label="Log In" variant="secondary" />
        </View>
      </GradientCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    gap: spacing.md,
  },
  brandMark: {
    alignItems: 'center',
    borderRadius: borderRadius.md,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  brandMarkText: {
    fontSize: 28,
    fontWeight: '900',
  },
  logo: {
    fontSize: typography.hero,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: 26,
    fontWeight: '800',
  },
  description: {
    fontSize: 21,
    fontWeight: '700',
    lineHeight: 32,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  noticeTitle: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
  noticeBody: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 26,
    marginTop: spacing.sm,
  },
});
