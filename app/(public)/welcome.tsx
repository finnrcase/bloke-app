import { StyleSheet, Text, View } from 'react-native';
import { LogIn, UserPlus } from 'lucide-react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppScreen } from '@/components/AppScreen';
import { borderRadius, colors, spacing, typography } from '@/constants/theme';

export default function WelcomeScreen() {
  return (
    <AppScreen>
      <AppCard tone="dark" style={styles.heroCard}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>B</Text>
        </View>
        <Text style={styles.logo}>BLOKE</Text>
        <Text style={styles.subtitle}>Learn. Act. Log.</Text>
        <Text style={styles.description}>
          A simple path for young men to build discipline, purpose, and brotherhood.
        </Text>

        <View style={styles.actions}>
          <AppButton href="/signup" icon={UserPlus} label="Create Account" variant="accent" />
          <AppButton href="/login" icon={LogIn} label="Log In" variant="secondary" />
        </View>
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    gap: spacing.md,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: borderRadius.md,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  brandMarkText: {
    color: colors.black,
    fontSize: 28,
    fontWeight: '900',
  },
  logo: {
    color: colors.inverseText,
    fontSize: typography.hero,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    color: colors.gold,
    fontSize: 26,
    fontWeight: '800',
  },
  description: {
    color: colors.inverseMuted,
    fontSize: 21,
    fontWeight: '700',
    lineHeight: 32,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
});
