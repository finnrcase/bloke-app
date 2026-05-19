import { Href, Link } from 'expo-router';
import { ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borderRadius, colors, spacing } from '@/constants/theme';

type IconComponent = ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;

type BaseButtonProps = {
  disabled?: boolean;
  icon?: IconComponent;
  label: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost';
};

type LinkButtonProps = BaseButtonProps & {
  href: Href;
  onPress?: never;
};

type PressButtonProps = BaseButtonProps & {
  href?: never;
  onPress: () => void;
};

type AppButtonProps = LinkButtonProps | PressButtonProps;

export function AppButton({ disabled, href, icon: Icon, label, onPress, variant = 'primary' }: AppButtonProps) {
  const content = (
    <View style={[styles.button, styles[`${variant}Button`], disabled && styles.disabled]}>
      {Icon ? <Icon color={getLabelColor(variant)} size={20} strokeWidth={2.5} /> : null}
      <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
    </View>
  );

  if (href) {
    return (
      <Link href={href} asChild>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          style={({ pressed }) => [
            styles.pressable,
            pressed && styles.pressed,
          ]}>
          {content}
        </Pressable>
      </Link>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        pressed && styles.pressed,
      ]}>
      {content}
    </Pressable>
  );
}

function getLabelColor(variant: NonNullable<BaseButtonProps['variant']>) {
  if (variant === 'primary') return colors.inverseText;
  if (variant === 'accent') return colors.black;
  return colors.text;
}

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
  },
  button: {
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
  },
  accentButton: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  ghostButton: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
    textAlign: 'center',
  },
  primaryLabel: {
    color: colors.inverseText,
  },
  secondaryLabel: {
    color: colors.text,
  },
  accentLabel: {
    color: colors.black,
  },
  ghostLabel: {
    color: colors.text,
  },
});
