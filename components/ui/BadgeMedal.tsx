import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { LucideIcon } from '@/constants/icons';
import { BadgeTier } from '@/constants/badgeVisuals';
import { fonts, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type BadgeMedalProps = {
  icon: LucideIcon;
  label?: string;
  locked?: boolean;
  size?: 'sm' | 'md' | 'lg';
  tier?: BadgeTier;
};

const SIZE_MAP = {
  sm: { medal: 40, ring: 3, icon: 18, label: 12 },
  md: { medal: 56, ring: 4, icon: 24, label: 13 },
  lg: { medal: 88, ring: 6, icon: 40, label: 15 },
} as const;

export function BadgeMedal({
  icon: Icon,
  label,
  locked = false,
  size = 'md',
  tier = 'bronze',
}: BadgeMedalProps) {
  const theme = useTheme();
  const dim = SIZE_MAP[size];
  const inner = dim.medal - dim.ring * 2;

  const tierColor = locked
    ? theme.disabled
    : tier === 'gold'
      ? theme.tierGold
      : tier === 'silver'
        ? theme.tierSilver
        : theme.tierBronze;

  const ringColors: [string, string] = locked
    ? [theme.disabled, theme.border]
    : [tierColor, theme.accentBorder];

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={ringColors}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={[
          styles.medalRing,
          { width: dim.medal, height: dim.medal, borderRadius: dim.medal / 2 },
        ]}>
        <View
          style={[
            styles.medalInner,
            {
              backgroundColor: locked ? theme.cardMuted : theme.cardInverted,
              borderRadius: inner / 2,
              height: inner,
              width: inner,
            },
          ]}>
          <Icon color={tierColor} size={dim.icon} strokeWidth={2.5} />
        </View>
      </LinearGradient>
      {label ? (
        <Text
          numberOfLines={2}
          style={[
            styles.label,
            { color: locked ? theme.textMuted : theme.textPrimary, fontSize: dim.label },
          ]}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.xs },
  medalRing: { alignItems: 'center', justifyContent: 'center' },
  medalInner: { alignItems: 'center', justifyContent: 'center' },
  label: {
    fontFamily: fonts.body.bold,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
