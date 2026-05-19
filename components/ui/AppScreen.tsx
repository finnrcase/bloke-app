import { PropsWithChildren } from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DemoModeBadge } from '@/components/DemoModeBadge';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type AppScreenProps = PropsWithChildren<{
  contentStyle?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
}>;

export function AppScreen({ children, contentStyle, innerStyle }: AppScreenProps) {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View pointerEvents="none" style={[styles.backdropTop, { backgroundColor: theme.subtleGlow }]} />
      <View
        pointerEvents="none"
        style={[styles.backdropBottom, { backgroundColor: theme.isDark ? 'rgba(105, 118, 86, 0.18)' : 'rgba(105, 118, 86, 0.12)' }]}
      />
      <ScrollView
        contentContainerStyle={[styles.content, contentStyle]}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.inner, innerStyle]}>
          <DemoModeBadge />
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
  backdropTop: {
    borderRadius: 999,
    height: 260,
    position: 'absolute',
    right: -120,
    top: -120,
    width: 260,
  },
  backdropBottom: {
    borderRadius: 999,
    bottom: -140,
    height: 280,
    left: -120,
    position: 'absolute',
    width: 280,
  },
});
