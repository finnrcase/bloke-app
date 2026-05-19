import { router } from 'expo-router';
import { LogIn, UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppPressButton } from '@/components/AppPressButton';
import { AppScreen } from '@/components/AppScreen';
import { FormTextInput } from '@/components/FormTextInput';
import { GlassCard } from '@/components/ui/GlassCard';
import { spacing, typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { signUpWithEmail } from '@/lib/auth';

export default function SignupScreen() {
  const theme = useTheme();
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');

  async function handleSignup() {
    setErrorMessage('');

    if (!email.trim() || !password || !confirmPassword) {
      setErrorMessage('Fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const { error, hasSession } = await signUpWithEmail(email, password);

      if (error) {
        setErrorMessage(error);
        return;
      }

      router.replace(hasSession ? '/onboarding' : '/login');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not create account.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AppScreen>
      <GlassCard>
        <Text style={[styles.eyebrow, { color: theme.accent }]}>JOIN BLOKE</Text>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Create account</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Start with a simple account. Then set your path and first goal.
        </Text>

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
            autoComplete="new-password"
            label="Password"
            onChangeText={setPassword}
            placeholder="Create a password"
            secureTextEntry
            value={password}
          />
          <FormTextInput
            autoComplete="new-password"
            label="Confirm password"
            onChangeText={setConfirmPassword}
            placeholder="Repeat your password"
            secureTextEntry
            value={confirmPassword}
          />
        </View>

        {errorMessage ? <Text style={[styles.error, { color: theme.error }]}>{errorMessage}</Text> : null}

        <View style={styles.actions}>
          <AppPressButton
            disabled={isLoading}
            icon={UserPlus}
            label={isLoading ? 'Creating account...' : 'Create account'}
            onPress={handleSignup}
          />
          <AppButton href="/login" icon={LogIn} label="Log In" variant="secondary" />
        </View>
      </GlassCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: typography.eyebrow,
    fontWeight: '900',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: typography.titleLarge,
    fontWeight: '900',
    lineHeight: 46,
  },
  body: {
    fontSize: 18,
    lineHeight: 28,
    marginTop: spacing.sm,
  },
  form: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  error: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.lg,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
});
