import { StyleSheet, Text, View } from 'react-native';

import { borderRadius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type ProgressBarProps = {
  label?: string;
  tone?: 'default' | 'inverse';
  value: number;
};

export function ProgressBar({ label, tone = 'default', value }: ProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(1, value));
  const theme = useTheme();
  const isInverse = tone === 'inverse';

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[styles.label, { color: isInverse ? theme.textInverseMuted : theme.textMuted }]}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.track,
          { backgroundColor: isInverse ? 'rgba(255, 249, 239, 0.16)' : theme.progressTrack },
        ]}>
        <View style={[styles.fill, { backgroundColor: theme.accent, width: `${clampedValue * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  track: {
    borderRadius: borderRadius.pill,
    height: 14,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: borderRadius.pill,
    height: '100%',
  },
});
