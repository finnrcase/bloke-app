import { router } from 'expo-router';
import { LogIn, UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppPressButton } from '@/components/AppPressButton';
import { AppScreen } from '@/components/AppScreen';
import { FormTextInput } from '@/components/FormTextInput';
import { colors, spacing, typography } from '@/constants/theme';
import { signInWithEmail } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');

  async function handleLogin() {
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Enter your email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signInWithEmail(email, password);

      if (result.error || !result.userId) {
        setErrorMessage(result.error ?? 'Could not log in.');
        return;
      }

      // A userId is only returned when Supabase is configured, so this is safe.
      const { data: profile } = await supabase!
        .from('profiles')
        .select('onboarding_complete')
        .eq('id', result.userId)
        .maybeSingle();

      router.replace(profile?.onboarding_complete ? '/home' : '/onboarding');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not log in.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AppScreen>
      <AppCard>
        <Text style={styles.eyebrow}>BLOKE ACCOUNT</Text>
        <Text style={styles.title}>Log in</Text>
        <Text style={styles.body}>Step back into the work. Your next week is waiting.</Text>

        <View style={styles.form}>
          <FormTextInput
            autoCapitalize="none"
            autoComplete="email"
            inputMode="email"
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="you@example.com"
            value={email}
          />
          <FormTextInput
            autoComplete="password"
            label="Password"
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry
            value={password}
          />
        </View>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <View style={styles.actions}>
          <AppPressButton
            disabled={isLoading}
            icon={LogIn}
            label={isLoading ? 'Logging in...' : 'Log In'}
            onPress={handleLogin}
          />
          <AppButton href="/signup" icon={UserPlus} label="Create Account" variant="secondary" />
        </View>
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: colors.gold,
    fontSize: typography.eyebrow,
    fontWeight: '900',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: typography.titleLarge,
    fontWeight: '900',
    lineHeight: 46,
  },
  body: {
    color: colors.mutedText,
    fontSize: 18,
    lineHeight: 28,
    marginTop: spacing.sm,
  },
  form: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  error: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.lg,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
});
