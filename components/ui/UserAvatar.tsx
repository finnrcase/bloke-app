import { useEffect, useMemo, useState } from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { borderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type UserAvatarProps = {
  borderColor?: string;
  imageUrl?: string | null;
  name?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function UserAvatar({ borderColor, imageUrl, name, size = 40, style }: UserAvatarProps) {
  const theme = useTheme();
  const [hasImageError, setHasImageError] = useState(false);
  const trimmedImageUrl = imageUrl?.trim() ?? '';
  const shouldShowImage = Boolean(trimmedImageUrl) && !hasImageError;
  const initials = useMemo(() => getInitials(name), [name]);
  const textSize = Math.max(12, Math.round(size * 0.34));

  useEffect(() => {
    setHasImageError(false);
  }, [trimmedImageUrl]);

  return (
    <View
      style={[
        styles.avatar,
        {
          backgroundColor: theme.cardInverted,
          borderColor: borderColor ?? theme.accentBorder,
          borderRadius: borderRadius.pill,
          height: size,
          width: size,
        },
        style,
      ]}>
      {shouldShowImage ? (
        <Image
          accessibilityIgnoresInvertColors
          onError={() => setHasImageError(true)}
          source={{ uri: trimmedImageUrl }}
          style={styles.image}
        />
      ) : (
        <Text style={[styles.initials, { color: theme.textInverse, fontSize: textSize }]}>{initials}</Text>
      )}
    </View>
  );
}

function getInitials(name?: string | null) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return 'B';
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  initials: {
    fontWeight: '900',
  },
});
