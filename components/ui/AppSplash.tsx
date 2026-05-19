import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  ImageBackground,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { darkTheme, spacing, typography } from '@/constants/theme';

const splashBackground = require('../../lib/loadingpage.png');
const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);

type AppSplashProps = {
  message?: string;
};

export function AppSplash({ message = 'Preparing your path' }: AppSplashProps) {
  const { width } = useWindowDimensions();
  const fade = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(1.04)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        duration: 700,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(imageScale, {
        duration: 5200,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
            toValue: 0,
            useNativeDriver: true,
          }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(progress, {
            duration: 1700,
            easing: Easing.inOut(Easing.cubic),
            toValue: 1,
            useNativeDriver: false,
          }),
          Animated.timing(progress, {
            duration: 420,
            easing: Easing.out(Easing.quad),
            toValue: 0,
            useNativeDriver: false,
          }),
        ]),
      ),
    ]).start();
  }, [fade, imageScale, progress, pulse]);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [width * 0.08, width * 0.52],
  });
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.9],
  });
  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.03],
  });

  return (
    <View accessibilityLabel="Bloke loading screen" style={styles.root}>
      <AnimatedImageBackground
        source={splashBackground}
        resizeMode="cover"
        style={[styles.background, { transform: [{ scale: imageScale }] }]}
      />
      <LinearGradient
        colors={['rgba(5,5,5,0.32)', 'rgba(10,9,8,0.68)', 'rgba(5,5,5,0.9)']}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(200,155,74,0.22)', 'rgba(140,93,47,0)', 'rgba(5,5,5,0.18)']}
        start={{ x: 0.16, y: 0.08 }}
        end={{ x: 0.86, y: 0.92 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.content, { opacity: fade }]}>
        <Animated.View style={[styles.markWrap, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]}>
          <View style={styles.markLine} />
        </Animated.View>
        <Text style={styles.logo}>BLOKE</Text>
        <Text style={styles.subtitle}>Learn. Act. Log.</Text>

        <View style={styles.loaderWrap}>
          <View style={styles.loaderTrack}>
            <Animated.View style={[styles.loaderFill, { width: barWidth }]} />
          </View>
          <Text style={styles.message}>{message}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: darkTheme.background,
    flex: 1,
    overflow: 'hidden',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    height: '100%',
    width: '100%',
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  markWrap: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: 96,
  },
  markLine: {
    backgroundColor: darkTheme.accent,
    borderRadius: 999,
    height: 3,
    width: 82,
  },
  logo: {
    color: darkTheme.textPrimary,
    fontSize: typography.display,
    fontWeight: '900',
    letterSpacing: 8,
    lineHeight: 72,
    textAlign: 'center',
  },
  subtitle: {
    color: darkTheme.textSecondary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  loaderWrap: {
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xxxl,
    width: '100%',
  },
  loaderTrack: {
    backgroundColor: 'rgba(255, 249, 239, 0.18)',
    borderRadius: 999,
    height: 3,
    maxWidth: 280,
    overflow: 'hidden',
    width: '62%',
  },
  loaderFill: {
    backgroundColor: darkTheme.accent,
    borderRadius: 999,
    height: '100%',
  },
  message: {
    color: darkTheme.textSecondary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
