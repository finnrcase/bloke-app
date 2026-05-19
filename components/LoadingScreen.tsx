import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { colors, spacing } from '@/constants/theme';

export function LoadingScreen() {
  return (
    <AppScreen>
      <View style={styles.content}>
        <ActivityIndicator color={colors.black} size="large" />
        <Text style={styles.text}>Checking your session...</Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    color: colors.mutedText,
    fontSize: 18,
    fontWeight: '700',
  },
});
