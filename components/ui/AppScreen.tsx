import { PropsWithChildren } from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/theme';

type AppScreenProps = PropsWithChildren<{
  contentStyle?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
}>;

export function AppScreen({ children, contentStyle, innerStyle }: AppScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.content, contentStyle]}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.inner, innerStyle]}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  inner: {
    alignSelf: 'center',
    gap: spacing.lg,
    maxWidth: 720,
    width: '100%',
  },
});
