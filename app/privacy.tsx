import { FileText } from 'lucide-react-native';
import { StyleSheet, Text } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { GlassCard } from '@/components/ui/GlassCard';
import { HeroSection } from '@/components/ui/HeroSection';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export default function PrivacyScreen() {
  const theme = useTheme();

  return (
    <AppScreen contentStyle={styles.content}>
      <HeroSection
        eyebrow="Legal"
        icon={FileText}
        subtitle="Placeholder policy for closed beta preparation."
        title="Privacy Policy"
      />
      <GlassCard>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Bloke collects account details, profile information, chapter membership data, weekly check-ins,
          and app usage data needed to operate accountability features. Location is used only to support
          chapter discovery when a user grants permission. Bloke does not sell personal data.
        </Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Replace this placeholder with a reviewed privacy policy before public production launch. Include
          contact details, data retention, deletion requests, analytics, crash reporting, and third-party
          processors such as Supabase, Expo, Google Play, and any map provider.
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
