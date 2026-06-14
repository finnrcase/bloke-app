import { Crown, Search, Shield, ShieldCheck, User, Users } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppPressButton } from '@/components/AppPressButton';
import { AppScreen } from '@/components/AppScreen';
import { FormTextInput } from '@/components/FormTextInput';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Chapter = Database['public']['Tables']['chapters']['Row'];
type ProfileRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'full_name' | 'username' | 'role' | 'created_at'
>;

type RoleOption = 'user' | 'chapter_member' | 'chapter_leader' | 'global_admin' | 'corporate_bloke';

const ROLE_OPTIONS: RoleOption[] = ['user', 'chapter_member', 'chapter_leader', 'global_admin', 'corporate_bloke'];

const ROLE_LABEL: Record<RoleOption, string> = {
  user: 'User',
  chapter_member: 'Member',
  chapter_leader: 'Leader',
  global_admin: 'Admin',
  corporate_bloke: 'Corporate Bloke',
};

function normalizeRole(role: string | null | undefined): RoleOption {
  if (role === 'corporate_bloke') return 'corporate_bloke';
  if (role === 'global_admin' || role === 'admin') return 'global_admin';
  if (role === 'chapter_leader' || role === 'facilitator') return 'chapter_leader';
  if (role === 'chapter_member' || role === 'member') return 'chapter_member';
  return 'user';
}

export default function AdminRolesScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [assignChapterByUser, setAssignChapterByUser] = useState<Record<string, string>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadChapters = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from('chapters').select('*').order('name');
      if (error) throw error;
      setChapters(data ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load chapters.');
    }
  }, []);

  useEffect(() => {
    loadChapters();
  }, [loadChapters]);

  async function handleSearch() {
    if (!supabase) {
      setErrorMessage('Supabase is not configured.');
      return;
    }
    setErrorMessage('');
    setSuccessMessage('');
    setIsSearching(true);

    try {
      const q = query.trim();
      let req = supabase
        .from('profiles')
        .select('id, full_name, username, role, created_at');

      if (q) {
        const safe = q.replace(/[%_,()]/g, '');
        req = req.or(`full_name.ilike.%${safe}%,username.ilike.%${safe}%`);
      }

      const { data, error } = await req.order('created_at', { ascending: false }).limit(25);
      if (error) throw error;
      setUsers(data ?? []);
      setHasSearched(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Search failed.');
    } finally {
      setIsSearching(false);
    }
  }

  async function changeRole(userId: string, role: RoleOption) {
    if (!supabase) return;
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
      if (error) throw error;
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
      setSuccessMessage(`Role updated to ${ROLE_LABEL[role]}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not update role.');
    }
  }

  async function assignLeader(userId: string) {
    const chapterId = assignChapterByUser[userId];
    if (!chapterId) {
      setErrorMessage('Pick a chapter to assign.');
      return;
    }
    if (!supabase) return;

    setErrorMessage('');
    setSuccessMessage('');
    try {
      const { error } = await supabase
        .from('chapter_members')
        .upsert(
          {
            chapter_id: chapterId,
            profile_id: userId,
            role: 'chapter_leader',
            status: 'active',
          },
          { onConflict: 'chapter_id,profile_id' },
        );
      if (error) throw error;
      setSuccessMessage('Chapter leader assigned.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not assign leader.');
    }
  }

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <SectionHeader
          eyebrow="ROLES"
          icon={Shield}
          title="Manage user roles"
          subtitle="Search by name or username. Change roles and assign chapter leaders."
        />

        <GlassCard>
          <FormTextInput
            autoCapitalize="none"
            label="Search"
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            placeholder="Name or username"
            returnKeyType="search"
            value={query}
          />
          <AppPressButton
            disabled={isSearching}
            icon={Search}
            label={isSearching ? 'Searching…' : 'Search'}
            onPress={handleSearch}
          />
        </GlassCard>

        {errorMessage ? <Text style={[styles.error, { color: theme.error }]}>{errorMessage}</Text> : null}
        {successMessage ? <Text style={[styles.success, { color: theme.success }]}>{successMessage}</Text> : null}

        {isSearching ? (
          <ActivityIndicator color={theme.accent} />
        ) : !hasSearched ? (
          <Text style={[styles.muted, { color: theme.textSecondary }]}>
            Search to find users. Leave blank to list the 25 most recent profiles.
          </Text>
        ) : users.length === 0 ? (
          <Text style={[styles.muted, { color: theme.textSecondary }]}>No users match that search.</Text>
        ) : (
          users.map((user) => {
            const current = normalizeRole(user.role);
            const pickerChapterId = assignChapterByUser[user.id];

            return (
              <GlassCard key={user.id}>
                <View style={styles.userHeader}>
                  <View style={[styles.avatar, { backgroundColor: theme.accentSurface }]}>
                    <User color={theme.accent} size={22} strokeWidth={2.5} />
                  </View>
                  <View style={styles.userCopy}>
                    <Text style={[styles.userName, { color: theme.textPrimary }]}>
                      {user.full_name ?? user.username ?? '(no name)'}
                    </Text>
                    <Text style={[styles.userMeta, { color: theme.textSecondary }]}>
                      {user.username ? `@${user.username} · ` : ''}
                      {ROLE_LABEL[current]}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.subLabel, { color: theme.textSecondary }]}>Role</Text>
                <View style={styles.roleRow}>
                  {ROLE_OPTIONS.map((role) => {
                    const active = role === current;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        disabled={active}
                        key={role}
                        onPress={() => changeRole(user.id, role)}
                        style={[
                          styles.rolePill,
                          {
                            backgroundColor: active ? theme.accentSurface : theme.cardMuted,
                            borderColor: active ? theme.accentBorder : theme.border,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.rolePillText,
                            { color: active ? theme.accent : theme.textPrimary },
                          ]}>
                          {ROLE_LABEL[role]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[styles.subLabel, { color: theme.textSecondary }]}>Assign as chapter leader</Text>
                {chapters.length === 0 ? (
                  <Text style={[styles.muted, { color: theme.textSecondary }]}>
                    No chapters yet. Create one in Chapters.
                  </Text>
                ) : (
                  <View style={styles.chapterRow}>
                    {chapters.map((chapter) => {
                      const active = chapter.id === pickerChapterId;
                      return (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          key={chapter.id}
                          onPress={() =>
                            setAssignChapterByUser((prev) => ({ ...prev, [user.id]: chapter.id }))
                          }
                          style={[
                            styles.chapterPill,
                            {
                              backgroundColor: active ? theme.accentSurface : theme.cardMuted,
                              borderColor: active ? theme.accentBorder : theme.border,
                            },
                          ]}>
                          <Text
                            style={[styles.chapterPillText, { color: theme.textPrimary }]}>
                            {chapter.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                <AppPressButton
                  disabled={!pickerChapterId}
                  icon={Crown}
                  label="Make chapter leader"
                  onPress={() => assignLeader(user.id)}
                  variant="secondary"
                />
              </GlassCard>
            );
          })
        )}

        <View style={styles.legendWrap}>
          <View style={styles.legendItem}>
            <Users color={theme.textMuted} size={14} strokeWidth={2.5} />
            <Text style={[styles.legend, { color: theme.textMuted }]}>
              Email search isn't included — Supabase auth.users requires a server RPC. Username/name search shown above.
            </Text>
          </View>
          <View style={styles.legendItem}>
            <ShieldCheck color={theme.textMuted} size={14} strokeWidth={2.5} />
            <Text style={[styles.legend, { color: theme.textMuted }]}>
              All changes are enforced by Supabase RLS — non-admins cannot reach this screen or its writes.
            </Text>
          </View>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg, padding: spacing.lg },
  error: { fontSize: 16, fontWeight: '700' },
  success: { fontSize: 16, fontWeight: '700' },
  muted: { fontSize: 14 },
  userHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  userCopy: { flex: 1, gap: 2 },
  userName: { fontSize: 17, fontWeight: '800' },
  userMeta: { fontSize: 14 },
  subLabel: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  rolePill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  rolePillText: { fontSize: 14, fontWeight: '800' },
  chapterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chapterPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chapterPillText: { fontSize: 14, fontWeight: '700' },
  legendWrap: { gap: spacing.xs, paddingHorizontal: spacing.sm },
  legendItem: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.xs },
  legend: { flex: 1, fontSize: 13 },
});
