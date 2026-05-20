import { LifeBuoy } from 'lucide-react-native';
import { StyleSheet, Text } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { GlassCard } from '@/components/ui/GlassCard';
import { HeroSection } from '@/components/ui/HeroSection';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export default function SupportScreen() {
  const theme = useTheme();

  return (
    <AppScreen contentStyle={styles.content}>
      <HeroSection
        eyebrow="Help"
        icon={LifeBuoy}
        subtitle="Closed beta support placeholder."
        title="Support"
      />
      <GlassCard>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          For beta support, email support@bloke.app with your device model, Android version, app version,
          and a short description of the issue.
        </Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Before Play Store production launch, replace this page with final support channels, response
          expectations, safety escalation language, and account deletion instructions.
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
