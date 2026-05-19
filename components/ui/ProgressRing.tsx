import { StyleSheet, Text, View } from 'react-native';

import { borderRadius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type ProgressRingProps = {
  label: string;
  value: number;
};

export function ProgressRing({ label, value }: ProgressRingProps) {
  const clampedValue = Math.max(0, Math.min(1, value));
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={[styles.ring, { backgroundColor: theme.progressTrack, borderColor: theme.border }]}>
        <View
          style={[
            styles.fill,
            {
              borderColor: clampedValue > 0.66 ? theme.accent : theme.borderStrong,
              transform: [{ rotate: `${Math.round(clampedValue * 270)}deg` }],
            },
          ]}
        />
        <View style={[styles.inner, { backgroundColor: theme.cardInverted }]}>
          <Text style={[styles.value, { color: theme.textInverse }]}>{Math.round(clampedValue * 100)}%</Text>
        </View>
      </View>
      <Text style={[styles.label, { color: theme.textInverseMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  ring: {
    alignItems: 'center',
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    height: 96,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 96,
  },
  fill: {
    borderLeftColor: 'transparent',
    borderRadius: borderRadius.pill,
    borderTopColor: 'transparent',
    borderWidth: 8,
    height: 84,
    position: 'absolute',
    width: 84,
  },
  inner: {
    alignItems: 'center',
    borderRadius: borderRadius.pill,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
  value: {
    fontSize: 20,
    fontWeight: '900',
  },
  label: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
