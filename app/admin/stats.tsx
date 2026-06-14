import { BarChart3, Inbox, KeyRound, MapPin, Target, TrendingUp, UserPlus, Users } from 'lucide-react-native';
import { ComponentType, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { demoChapter, demoChapterMembers, demoMemberProfiles, demoProfileDetails } from '@/lib/demoData';
import { supabase } from '@/lib/supabase';
import { GeographicTrend, RankedSelectionStat, getAdminStructuredProfileStats } from '@/lib/supabase/profiles';
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
  const { isDemoMode } = useAuth();
  const theme = useTheme();
  const [counts, setCounts] = useState<Counts>({
    users: 0,
    chapters: 0,
    pendingRequests: 0,
    inviteCodes: 0,
    activeMembers: 0,
  });
  const [signups, setSignups] = useState<RecentProfile[]>([]);
  const [geographicTrends, setGeographicTrends] = useState<GeographicTrend[]>([]);
  const [goalStats, setGoalStats] = useState<RankedSelectionStat[]>([]);
  const [interestStats, setInterestStats] = useState<RankedSelectionStat[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (isDemoMode) {
      setCounts({
        activeMembers: demoChapterMembers.filter((member) => member.status === 'active').length,
        chapters: 1,
        inviteCodes: 1,
        pendingRequests: 0,
        users: demoMemberProfiles.length,
      });
      setSignups(demoMemberProfiles.map((profile) => ({
        created_at: profile.created_at,
        full_name: profile.full_name,
        id: profile.id,
        role: profile.role,
        username: profile.username,
      })));
      setInterestStats(demoProfileDetails.interests.map((label, index) => ({
        id: label.toLocaleLowerCase().replace(/\s+/g, '-'),
        label,
        selection_count: Math.max(1, demoMemberProfiles.length - index),
      })));
      setGoalStats(demoProfileDetails.goals.map((label, index) => ({
        id: label.toLocaleLowerCase().replace(/\s+/g, '-'),
        label,
        selection_count: Math.max(1, demoMemberProfiles.length - index),
      })));
      setGeographicTrends([
        {
          city: demoChapter.city ?? 'Santa Barbara',
          member_count: demoMemberProfiles.length,
          state: demoChapter.state ?? 'CA',
          top_goal: demoProfileDetails.goals[0] ?? null,
          top_interest: demoProfileDetails.interests[0] ?? null,
        },
      ]);
      setErrorMessage('');
      setIsLoading(false);
      return;
    }

    if (!supabase) {
      setErrorMessage('Supabase is not configured. Add your Expo public Supabase env vars.');
      setIsLoading(false);
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const [users, chapters, pending, codes, members, recent, structuredStats] = await Promise.all([
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
        getAdminStructuredProfileStats(8),
      ]);

      for (const result of [users, chapters, pending, codes, members, recent]) {
        if (result.error) throw result.error;
      }

      if (structuredStats.error) throw new Error(structuredStats.error);

      setCounts({
        users: users.count ?? 0,
        chapters: chapters.count ?? 0,
        pendingRequests: pending.count ?? 0,
        inviteCodes: codes.count ?? 0,
        activeMembers: members.count ?? 0,
      });
      setSignups(recent.data ?? []);
      setGeographicTrends(structuredStats.data.geographicTrends);
      setGoalStats(structuredStats.data.goalStats);
      setInterestStats(structuredStats.data.interestStats);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load stats.');
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode]);

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

            <SectionHeader
              icon={TrendingUp}
              title="Member connection trends"
              subtitle="Aggregated selections only. Individual member choices stay private."
            />
            <View style={styles.trendGrid}>
              <RankedStatsCard
                emptyLabel="No interest selections yet."
                icon={Target}
                items={interestStats}
                title="Most common interests"
              />
              <RankedStatsCard
                emptyLabel="No goal selections yet."
                icon={BarChart3}
                items={goalStats}
                title="Most common goals"
              />
            </View>

            <SectionHeader
              icon={MapPin}
              title="Geographic trends"
              subtitle="City and state clusters with their top aggregate interest and goal."
            />
            <GlassCard>
              {geographicTrends.length === 0 ? (
                <Text style={[styles.empty, { color: theme.textSecondary }]}>No location trends yet.</Text>
              ) : (
                geographicTrends.map((trend, index) => (
                  <View
                    key={`${trend.city}-${trend.state}`}
                    style={[
                      styles.geoRow,
                      index < geographicTrends.length - 1 ? { borderBottomColor: theme.border, borderBottomWidth: 1 } : null,
                    ]}>
                    <View style={styles.geoCopy}>
                      <Text style={[styles.geoTitle, { color: theme.textPrimary }]}>
                        {[trend.city, trend.state].filter(Boolean).join(', ')}
                      </Text>
                      <Text style={[styles.geoMeta, { color: theme.textSecondary }]}>
                        {trend.member_count} members · {trend.top_interest ?? 'No top interest'} · {trend.top_goal ?? 'No top goal'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </GlassCard>

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

function RankedStatsCard({
  emptyLabel,
  icon: Icon,
  items,
  title,
}: {
  emptyLabel: string;
  icon: ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  items: RankedSelectionStat[];
  title: string;
}) {
  const theme = useTheme();
  const maxCount = Math.max(1, ...items.map((item) => item.selection_count));

  return (
    <View style={styles.trendCell}>
      <GlassCard>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: theme.accentSurface }]}>
            <Icon color={theme.accent} size={20} strokeWidth={2.5} />
          </View>
          <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>{title}</Text>
        </View>

        {items.length === 0 ? (
          <Text style={[styles.empty, { color: theme.textSecondary }]}>{emptyLabel}</Text>
        ) : (
          <View style={styles.rankedList}>
            {items.map((item) => (
              <View key={item.id} style={styles.rankedRow}>
                <View style={styles.rankedHeader}>
                  <Text style={[styles.rankedLabel, { color: theme.textPrimary }]}>{item.label}</Text>
                  <Text style={[styles.rankedCount, { color: theme.textMuted }]}>{item.selection_count}</Text>
                </View>
                <View style={[styles.rankedTrack, { backgroundColor: theme.progressTrack }]}>
                  <View
                    style={[
                      styles.rankedFill,
                      {
                        backgroundColor: theme.accent,
                        width: `${Math.max(8, (item.selection_count / maxCount) * 100)}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </GlassCard>
    </View>
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
  trendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  trendCell: {
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
  rankedList: {
    gap: spacing.md,
  },
  rankedRow: {
    gap: spacing.xs,
  },
  rankedHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rankedLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  rankedCount: {
    fontSize: 14,
    fontWeight: '900',
  },
  rankedTrack: {
    borderRadius: radius.pill,
    height: 10,
    overflow: 'hidden',
  },
  rankedFill: {
    borderRadius: radius.pill,
    height: '100%',
  },
  geoRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
  },
  geoCopy: {
    flex: 1,
    gap: 2,
  },
  geoTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  geoMeta: {
    fontSize: 14,
    lineHeight: 20,
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
