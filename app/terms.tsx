import { Scale } from 'lucide-react-native';
import { StyleSheet, Text } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { GlassCard } from '@/components/ui/GlassCard';
import { HeroSection } from '@/components/ui/HeroSection';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export default function TermsScreen() {
  const theme = useTheme();

  return (
    <AppScreen contentStyle={styles.content}>
      <HeroSection
        eyebrow="Legal"
        icon={Scale}
        subtitle="Placeholder terms for beta testers."
        title="Terms"
      />
      <GlassCard>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Bloke is an accountability and chapter discovery app. Users are responsible for their conduct,
          content, meeting participation, and compliance with local rules. Chapter leaders may approve,
          reject, or remove membership requests according to community standards.
        </Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Replace this placeholder with reviewed Terms of Service before production launch. Include
          eligibility, acceptable use, safety expectations, moderation, account termination, liability,
          subscriptions if applicable, and dispute terms.
        </Text>
      </GlassCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'flex-start',
  },
  body: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 26,
    marginBottom: spacing.md,
  },
});
