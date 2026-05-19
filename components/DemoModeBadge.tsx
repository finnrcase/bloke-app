import { StyleSheet, Text, View } from 'react-native';

import { borderRadius, spacing, typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { env } from '@/lib/env';

export function DemoModeBadge() {
  const theme = useTheme();

  if (!env.isDemoMode) {
    return null;
  }

  return (
    <View
      accessibilityLabel="Demo Mode is enabled"
      style={[styles.badge, { backgroundColor: theme.accentSurface, borderColor: theme.accentBorder }]}>
      <Text style={[styles.text, { color: theme.warning }]}>Demo Mode</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  text: {
    fontSize: typography.caption,
    fontWeight: '900',
  },
});
