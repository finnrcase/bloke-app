import { Href, Link } from 'expo-router';
import { ComponentType, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { borderRadius, shadows, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

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
  const [hovered, setHovered] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const theme = useTheme();
  const buttonColors = getButtonColors(variant, theme);

  function animateScale(value: number) {
    Animated.spring(scale, {
      friction: 7,
      tension: 180,
      toValue: value,
      useNativeDriver: true,
    }).start();
  }

  const content = (
    <Animated.View
      style={[
        styles.button,
        {
          backgroundColor: buttonColors.background,
          borderColor: hovered && !disabled ? theme.accentBorder : buttonColors.border,
        },
        variant === 'primary' || variant === 'accent' ? shadows.card : null,
        disabled && styles.disabled,
        { transform: [{ scale }] },
      ]}>
      <View pointerEvents="none" style={[styles.buttonGlow, variant === 'secondary' ? styles.subtleGlow : null]} />
      {Icon ? <Icon color={buttonColors.label} size={20} strokeWidth={2.5} /> : null}
      <Text style={[styles.label, { color: buttonColors.label }]}>{label}</Text>
    </Animated.View>
  );

  if (href) {
    return (
      <Link href={href} asChild>
        <Pressable
          accessibilityLabel={label}
          accessibilityRole="button"
          disabled={disabled}
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          onPressIn={() => animateScale(0.985)}
          onPressOut={() => animateScale(1)}
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
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPressIn={() => animateScale(0.985)}
      onPressOut={() => animateScale(1)}
      style={({ pressed }) => [
        styles.pressable,
        pressed && styles.pressed,
      ]}>
      {content}
    </Pressable>
  );
}

function getButtonColors(variant: NonNullable<BaseButtonProps['variant']>, theme: ReturnType<typeof useTheme>) {
  if (variant === 'primary') {
    return {
      background: theme.isDark ? theme.accent : theme.cardInverted,
      border: theme.isDark ? theme.accent : theme.cardInverted,
      label: theme.isDark ? theme.accentText : theme.textInverse,
    };
  }

  if (variant === 'accent') {
    return {
      background: theme.accent,
      border: theme.accent,
      label: theme.accentText,
    };
  }

  if (variant === 'ghost') {
    return {
      background: 'transparent',
      border: theme.border,
      label: theme.textPrimary,
    };
  }

  return {
    background: theme.card,
    border: theme.borderStrong,
    label: theme.textPrimary,
  };
}

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
  },
  button: {
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 62,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    position: 'relative',
    width: '100%',
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
  buttonGlow: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 999,
    height: 86,
    position: 'absolute',
    right: -34,
    top: -46,
    width: 86,
  },
  subtleGlow: {
    backgroundColor: 'rgba(200, 155, 74, 0.12)',
  },
  label: {
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
    textAlign: 'center',
  },
});
