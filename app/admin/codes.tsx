import * as Clipboard from 'expo-clipboard';
import { Copy, KeyRound, RefreshCw, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppPressButton } from '@/components/AppPressButton';
import { AppScreen } from '@/components/AppScreen';
import { FormTextInput } from '@/components/FormTextInput';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Chapter = Database['public']['Tables']['chapters']['Row'];
type InviteCode = Database['public']['Tables']['invite_codes']['Row'];

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode() {
  return `BLOKE-${Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('')}`;
}

export default function AdminCodesScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [code, setCode] = useState(generateCode());
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadChapters = useCallback(async () => {
    if (!supabase) {
      setErrorMessage('Supabase is not configured.');
      setIsLoading(false);
      return;
    }
    setErrorMessage('');
    try {
      const { data, error } = await supabase.from('chapters').select('*').order('name');
      if (error) throw error;
      const list = data ?? [];
      setChapters(list);
      setSelectedChapterId((current) => current ?? list[0]?.id ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load chapters.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCodes = useCallback(async (chapterId: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCodes(data ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load codes.');
    }
  }, []);

  useEffect(() => {
    loadChapters();
  }, [loadChapters]);

  useEffect(() => {
    if (selectedChapterId) {
      loadCodes(selectedChapterId);
    } else {
      setCodes([]);
    }
  }, [selectedChapterId, loadCodes]);

  async function handleGenerate() {
    setErrorMessage('');
    setSuccessMessage('');

    if (!supabase || !session) {
      setErrorMessage('Sign in required.');
      return;
    }
    if (!selectedChapterId) {
      setErrorMessage('Pick a chapter first.');
      return;
    }

    const trimmedCode = code.trim().toUpperCase();
    if (trimmedCode.length < 4 || trimmedCode.length > 64) {
      setErrorMessage('Code must be 4-64 characters.');
      return;
    }

    const parsedMaxUses = maxUses.trim() ? Number.parseInt(maxUses.trim(), 10) : null;
    if (parsedMaxUses !== null && (!Number.isInteger(parsedMaxUses) || parsedMaxUses <= 0)) {
      setErrorMessage('Max uses must be a positive integer.');
      return;
    }

    let expiresAtIso: string | null = null;
    if (expiresAt.trim()) {
      const date = new Date(expiresAt.trim());
      if (Number.isNaN(date.getTime())) {
        setErrorMessage('Expires at must be a valid date (YYYY-MM-DD).');
        return;
      }
      expiresAtIso = date.toISOString();
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('invite_codes').insert({
        code: trimmedCode,
        chapter_id: selectedChapterId,
        created_by: session.user.id,
        max_uses: parsedMaxUses,
        expires_at: expiresAtIso,
      });
      if (error) throw error;

      await Clipboard.setStringAsync(trimmedCode);
      setCopiedCode(trimmedCode);
      setSuccessMessage(`Code ${trimmedCode} created and copied.`);
      setCode(generateCode());
      setMaxUses('');
      setExpiresAt('');
      await loadCodes(selectedChapterId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not generate code.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRevoke(codeId: string) {
    setErrorMessage('');
    setSuccessMessage('');
    if (!supabase) return;
    try {
      const { error } = await supabase.from('invite_codes').delete().eq('id', codeId);
      if (error) throw error;
      setSuccessMessage('Code revoked.');
      if (selectedChapterId) await loadCodes(selectedChapterId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not revoke code.');
    }
  }

  async function handleCopy(value: string) {
    await Clipboard.setStringAsync(value);
    setCopiedCode(value);
  }

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SectionHeader
          eyebrow="CODES"
          icon={KeyRound}
          title="Generate invite codes"
          subtitle="Pick a chapter, set optional limits, and copy the new code."
        />

        {isLoading ? (
          <ActivityIndicator color={theme.accent} />
        ) : (
          <>
            <GlassCard>
              <Text style={[styles.label, { color: theme.textPrimary }]}>Chapter</Text>
              <View style={styles.chapterList}>
                {chapters.length === 0 ? (
                  <Text style={[styles.muted, { color: theme.textSecondary }]}>
                    No chapters yet. Create one in Chapters.
                  </Text>
                ) : (
                  chapters.map((chapter) => {
                    const active = chapter.id === selectedChapterId;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        key={chapter.id}
                        onPress={() => setSelectedChapterId(chapter.id)}
                        style={[
                          styles.chapterRow,
                          {
                            borderColor: active ? theme.accentBorder : theme.border,
                            backgroundColor: active ? theme.accentSurface : theme.cardMuted,
                          },
                        ]}>
                        <Text style={[styles.chapterName, { color: theme.textPrimary }]}>{chapter.name}</Text>
                        <Text style={[styles.chapterMeta, { color: theme.textSecondary }]}>
                          {[chapter.city, chapter.region, chapter.country].filter(Boolean).join(' · ') || '—'}
                        </Text>
                      </Pressable>
                    );
                  })
                )}
              </View>

              <FormTextInput
                autoCapitalize="characters"
                label="Code"
                onChangeText={setCode}
                value={code}
              />
              <FormTextInput
                inputMode="numeric"
                keyboardType="number-pad"
                label="Max uses (optional)"
                onChangeText={setMaxUses}
                placeholder="No limit"
                value={maxUses}
              />
              <FormTextInput
                autoCapitalize="none"
                label="Expires at (optional)"
                onChangeText={setExpiresAt}
                placeholder="YYYY-MM-DD"
                value={expiresAt}
              />

              {errorMessage ? (
                <Text style={[styles.error, { color: theme.error }]}>{errorMessage}</Text>
              ) : null}
              {successMessage ? (
                <Text style={[styles.success, { color: theme.success }]}>{successMessage}</Text>
              ) : null}

              <View style={styles.actions}>
                <AppPressButton
                  icon={RefreshCw}
                  label="New random"
                  onPress={() => setCode(generateCode())}
                  variant="ghost"
                />
                <AppPressButton
                  disabled={isSaving || !selectedChapterId}
                  icon={KeyRound}
                  label={isSaving ? 'Generating…' : 'Generate'}
                  onPress={handleGenerate}
                />
              </View>
            </GlassCard>

            <SectionHeader
              title="Existing codes"
              subtitle={selectedChapterId ? 'For the selected chapter.' : 'Pick a chapter to see its codes.'}
            />
            <GlassCard>
              {codes.length === 0 ? (
                <Text style={[styles.muted, { color: theme.textSecondary }]}>No codes yet.</Text>
              ) : (
                codes.map((row, index) => (
                  <View
                    key={row.id}
                    style={[
                      styles.codeRow,
                      index < codes.length - 1
                        ? { borderBottomColor: theme.border, borderBottomWidth: 1 }
                        : null,
                    ]}>
                    <View style={styles.codeCopy}>
                      <Text style={[styles.codeText, { color: theme.textPrimary }]}>{row.code}</Text>
                      <Text style={[styles.codeMeta, { color: theme.textSecondary }]}>
                        {row.current_uses}/{row.max_uses ?? '∞'} uses
                        {row.expires_at ? ` · expires ${new Date(row.expires_at).toLocaleDateString()}` : ''}
                      </Text>
                    </View>
                    <View style={styles.codeActions}>
                      <Pressable
                        accessibilityLabel="Copy code"
                        accessibilityRole="button"
                        onPress={() => handleCopy(row.code)}
                        style={[styles.iconBtn, { backgroundColor: theme.accentSurface }]}>
                        <Copy color={theme.accent} size={18} strokeWidth={2.5} />
                      </Pressable>
                      <Pressable
                        accessibilityLabel="Revoke code"
                        accessibilityRole="button"
                        onPress={() => handleRevoke(row.id)}
                        style={[styles.iconBtn, { backgroundColor: theme.cardMuted }]}>
                        <Trash2 color={theme.textPrimary} size={18} strokeWidth={2.5} />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </GlassCard>

            {copiedCode ? (
              <Text style={[styles.muted, { color: theme.textSecondary }]}>{copiedCode} copied to clipboard.</Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg, padding: spacing.lg },
  label: { fontSize: 16, fontWeight: '800' },
  chapterList: { gap: spacing.sm },
  chapterRow: {
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 2,
    padding: spacing.md,
  },
  chapterName: { fontSize: 17, fontWeight: '800' },
  chapterMeta: { fontSize: 14 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  error: { fontSize: 16, fontWeight: '700' },
  success: { fontSize: 16, fontWeight: '700' },
  muted: { fontSize: 14 },
  codeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  codeCopy: { flex: 1, gap: 2 },
  codeText: { fontSize: 18, fontWeight: '800', letterSpacing: 1.5 },
  codeMeta: { fontSize: 14 },
  codeActions: { flexDirection: 'row', gap: spacing.xs },
  iconBtn: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
});
