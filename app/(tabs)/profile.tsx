import { router } from 'expo-router';
import { LogOut, User } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { AppPressButton } from '@/components/AppPressButton';
import { AppScreen } from '@/components/AppScreen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { borderRadius, colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleLogout() {
    setIsSigningOut(true);
    setErrorMessage('');

    try {
      await signOut();
      router.replace('/welcome');
    } catch {
      setErrorMessage('Could not log out. Try again.');
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <AppScreen>
      <AppCard>
        <SectionHeader
          eyebrow="Profile"
          icon={User}
          title="Personal details and program settings."
        />
        <Text style={styles.body}>
          Profile, preferences, cohort membership, and account settings will be managed here.
        </Text>

        <View style={styles.metaBox}>
          <Text style={styles.metaLabel}>Signed in as</Text>
          <Text style={styles.metaValue}>{session?.user.email ?? 'Supabase user'}</Text>
        </View>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <View style={styles.actions}>
          <AppPressButton
            disabled={isSigningOut}
            icon={LogOut}
            label={isSigningOut ? 'Logging out...' : 'Log out'}
            onPress={handleLogout}
            variant="secondary"
          />
        </View>
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: colors.mutedText,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: spacing.md,
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
    fontSize: 19,
    lineHeight: 29,
    marginTop: spacing.md,
  },
  metaBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    marginTop: spacing.xl,
    padding: spacing.md,
  },
  metaLabel: {
    color: colors.mutedText,
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metaValue: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  error: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.lg,
  },
  actions: {
    marginTop: spacing.xl,
  },
});
