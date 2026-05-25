import { BarChart3, Inbox, KeyRound, MapPin, UserPlus, Users } from 'lucide-react-native';
import { ComponentType, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { radius, spacing, typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type RecentProfile = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'full_name' | 'username' | 'created_at' | 'role'
>;

type Counts = {
  users: number;
  chapters: number;
  pendingRequests: number;
  inviteCodes: number;
  activeMembers: number;
};

type StatCard = {
  icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  label: string;
  value: number;
};

export default function AdminStatsScreen() {
  const theme = useTheme();
  const [counts, setCounts] = useState<Counts>({
    users: 0,
    chapters: 0,
    pendingRequests: 0,
    inviteCodes: 0,
    activeMembers: 0,
  });
  const [signups, setSignups] = useState<RecentProfile[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabase) {
      setErrorMessage('Supabase is not configured. Add your Expo public Supabase env vars.');
      setIsLoading(false);
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const [users, chapters, pending, codes, members, recent] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('chapters').select('*', { count: 'exact', head: true }),
        supabase.from('chapter_join_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('invite_codes').select('*', { count: 'exact', head: true }),
        supabase.from('chapter_members').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase
          .from('profiles')
          .select('id, full_name, username, created_at, role')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      for (const result of [users, chapters, pending, codes, members, recent]) {
        if (result.error) throw result.error;
      }

      setCounts({
        users: users.count ?? 0,
        chapters: chapters.count ?? 0,
        pendingRequests: pending.count ?? 0,
        inviteCodes: codes.count ?? 0,
        activeMembers: members.count ?? 0,
      });
      setSignups(recent.data ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load stats.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cards: StatCard[] = [
    { icon: Users, label: 'Total users', value: counts.users },
    { icon: MapPin, label: 'Total chapters', value: counts.chapters },
    { icon: Inbox, label: 'Pending requests', value: counts.pendingRequests },
    { icon: KeyRound, label: 'Invite codes', value: counts.inviteCodes },
    { icon: UserPlus, label: 'Active members', value: counts.activeMembers },
  ];

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SectionHeader
          eyebrow="STATS"
          icon={BarChart3}
          title="Live counts"
          subtitle="Pulled directly from Supabase under admin RLS."
        />

        {errorMessage ? (
          <Text style={[styles.error, { color: theme.textPrimary }]}>{errorMessage}</Text>
        ) : null}

        {isLoading ? (
          <ActivityIndicator color={theme.accent} />
        ) : (
          <>
            <View style={styles.grid}>
              {cards.map((card) => (
                <View key={card.label} style={styles.cellWrap}>
                  <GlassCard>
                    <View style={styles.cardHeader}>
                      <View style={[styles.iconWrap, { backgroundColor: theme.accentSurface }]}>
                        <card.icon color={theme.accent} size={20} strokeWidth={2.5} />
                      </View>
                      <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>{card.label}</Text>
                    </View>
                    <Text style={[styles.cardValue, { color: theme.textPrimary }]}>{card.value}</Text>
                  </GlassCard>
                </View>
              ))}
            </View>

            <SectionHeader title="Recent signups" subtitle="Most recent 10 profiles." />
            <GlassCard>
              {signups.length === 0 ? (
                <Text style={[styles.empty, { color: theme.textSecondary }]}>No signups yet.</Text>
              ) : (
                signups.map((profile, index) => (
                  <View
                    key={profile.id}
                    style={[
                      styles.signupRow,
                      index < signups.length - 1 ? { borderBottomColor: theme.border, borderBottomWidth: 1 } : null,
                    ]}>
                    <View style={styles.signupCopy}>
                      <Text style={[styles.signupName, { color: theme.textPrimary }]}>
                        {profile.full_name ?? profile.username ?? '(no name)'}
                      </Text>
                      <Text style={[styles.signupMeta, { color: theme.textSecondary }]}>
                        {profile.role ?? 'user'} · {profile.created_at ? new Date(profile.created_at).toLocaleString() : '—'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </GlassCard>
          </>
        )}
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  cellWrap: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  cardLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  cardValue: {
    fontSize: typography.titleLarge,
    fontWeight: '900',
  },
  signupRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
  },
  signupCopy: {
    flex: 1,
    gap: 2,
  },
  signupName: {
    fontSize: 17,
    fontWeight: '800',
  },
  signupMeta: {
    fontSize: 14,
  },
  empty: {
    fontSize: 16,
  },
  error: {
    fontSize: 16,
    fontWeight: '700',
  },
});
