import { router } from 'expo-router';
import { BarChart3, KeyRound, ShieldCheck, Users, MapPin } from 'lucide-react-native';
import { ComponentType } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { radius, spacing, typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type AdminTile = {
  body: string;
  href: '/admin/codes' | '/admin/chapters' | '/admin/roles' | '/admin/stats';
  icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  title: string;
};

const TILES: AdminTile[] = [
  {
    title: 'Invite Codes',
    body: 'Generate, copy, and revoke invite codes for any chapter.',
    href: '/admin/codes',
    icon: KeyRound,
  },
  {
    title: 'Chapters',
    body: 'Create chapters, edit details, verify, and remove.',
    href: '/admin/chapters',
    icon: MapPin,
  },
  {
    title: 'Roles',
    body: 'Search users, change roles, and assign chapter leaders.',
    href: '/admin/roles',
    icon: Users,
  },
  {
    title: 'Stats',
    body: 'Live counts: users, chapters, pending requests, codes, members.',
    href: '/admin/stats',
    icon: BarChart3,
  },
];

export default function AdminHubScreen() {
  const theme = useTheme();

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SectionHeader
          eyebrow="ADMIN HUB"
          icon={ShieldCheck}
          title="Admin tools"
          subtitle="Global-admin actions for chapters, codes, roles, and stats."
        />
        <View style={styles.grid}>
          {TILES.map((tile) => (
            <Pressable
              accessibilityRole="button"
              key={tile.href}
              onPress={() => router.push(tile.href)}
              style={styles.tileWrap}>
              <GlassCard>
                <View style={styles.tileHeader}>
                  <View style={[styles.iconWrap, { backgroundColor: theme.accentSurface }]}>
                    <tile.icon color={theme.accent} size={22} strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.tileTitle, { color: theme.textPrimary }]}>{tile.title}</Text>
                </View>
                <Text style={[styles.tileBody, { color: theme.textSecondary }]}>{tile.body}</Text>
              </GlassCard>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  grid: {
    gap: spacing.md,
  },
  tileWrap: {
    width: '100%',
  },
  tileHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  tileTitle: {
    flex: 1,
    fontSize: typography.title,
    fontWeight: '900',
  },
  tileBody: {
    fontSize: 16,
    lineHeight: 24,
  },
});
