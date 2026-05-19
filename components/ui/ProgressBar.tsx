import { StyleSheet, Text, View } from 'react-native';

import { borderRadius, colors, spacing } from '@/constants/theme';

type ProgressBarProps = {
  label?: string;
  value: number;
};

export function ProgressBar({ label, value }: ProgressBarProps) {
  const clampedValue = Math.max(0, Math.min(1, value));

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clampedValue * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  label: {
    color: colors.mutedText,
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  track: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.pill,
    height: 12,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: colors.gold,
    borderRadius: borderRadius.pill,
    height: '100%',
  },
});
