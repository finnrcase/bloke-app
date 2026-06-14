import { Flag, MessageCircleWarning, ShieldCheck } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { demoChapter, demoChapterChatMessages } from '@/lib/demoData';
import { spacing, typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import {
  ChapterChatMessageReport,
  ChapterChatReportStatus,
  fetchChapterChatMessageReports,
  reviewChapterChatMessageReport,
} from '@/lib/supabase/messages';

const REVIEW_ACTIONS: { label: string; status: ChapterChatReportStatus }[] = [
  { label: 'Reviewing', status: 'reviewing' },
  { label: 'Resolve', status: 'resolved' },
  { label: 'Dismiss', status: 'dismissed' },
];

export default function AdminMessageReportsScreen() {
  const theme = useTheme();
  const { isDemoMode } = useAuth();
  const [reports, setReports] = useState<ChapterChatMessageReport[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);

  const demoReports = useMemo<ChapterChatMessageReport[]>(() => {
    const message = demoChapterChatMessages[1];

    if (!message) return [];

    return [
      {
        attachment_name: message.attachment_name,
        author_id: message.author_id,
        author_name: message.author_name,
        channel_name: 'General Chapter Chat',
        chapter_id: demoChapter.id,
        chapter_name: demoChapter.name,
        created_at: '2026-05-22T14:00:00.000Z',
        details: 'Demo report for moderation review.',
        id: '00000000-0000-4000-8000-000000000990',
        message_body: message.body,
        message_id: message.id,
        message_type: message.message_type,
        reason: 'other',
        reporter_id: '00000000-0000-4000-8000-000000000003',
        reporter_name: 'James Carter',
        reviewed_at: null,
        status: 'open',
      },
    ];
  }, []);

  const loadReports = useCallback(async () => {
    setErrorMessage('');
    setSavedMessage('');
    setIsLoading(true);

    if (isDemoMode || !supabase) {
      setReports(demoReports);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await fetchChapterChatMessageReports();
      if (error) throw new Error(error);
      setReports(data);
    } catch (error) {
      setReports([]);
      setErrorMessage(error instanceof Error ? error.message : 'Could not load message reports.');
    } finally {
      setIsLoading(false);
    }
  }, [demoReports, isDemoMode]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  async function handleReview(reportId: string, status: ChapterChatReportStatus) {
    setErrorMessage('');
    setSavedMessage('');
    setUpdatingReportId(reportId);

    try {
      if (isDemoMode || !supabase) {
        setReports((current) =>
          current.map((report) =>
            report.id === reportId ? { ...report, reviewed_at: new Date().toISOString(), status } : report,
          ),
        );
      } else {
        const { error } = await reviewChapterChatMessageReport(reportId, status);
        if (error) throw new Error(error);
        await loadReports();
      }

      setSavedMessage('Report updated.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not update report.');
    } finally {
      setUpdatingReportId(null);
    }
  }

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SectionHeader
          eyebrow="MODERATION"
          icon={MessageCircleWarning}
          title="Message reports"
          subtitle="Admin review queue for chapter chat reports."
        />

        {errorMessage ? <Text style={[styles.notice, { color: theme.error }]}>{errorMessage}</Text> : null}
        {savedMessage ? <Text style={[styles.notice, { color: theme.success }]}>{savedMessage}</Text> : null}

        {isLoading ? (
          <ActivityIndicator color={theme.accent} />
        ) : reports.length === 0 ? (
          <GlassCard>
            <View style={styles.empty}>
              <ShieldCheck color={theme.accent} size={28} strokeWidth={2.5} />
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No reports</Text>
              <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>The queue is clear.</Text>
            </View>
          </GlassCard>
        ) : (
          reports.map((report) => (
            <GlassCard key={report.id}>
              <View style={styles.reportTop}>
                <View style={[styles.reportIcon, { backgroundColor: theme.accentSurface }]}>
                  <Flag color={theme.accent} size={20} strokeWidth={2.5} />
                </View>
                <View style={styles.reportTitleBlock}>
                  <Text style={[styles.reportTitle, { color: theme.textPrimary }]}>
                    {formatReason(report.reason)} · {formatStatus(report.status)}
                  </Text>
                  <Text style={[styles.reportMeta, { color: theme.textSecondary }]}>
                    {report.chapter_name} / {report.channel_name}
                  </Text>
                </View>
              </View>

              <View style={[styles.messagePreview, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.previewLabel, { color: theme.textMuted }]}>Message</Text>
                <Text style={[styles.previewBody, { color: theme.textPrimary }]}>
                  {report.message_body ?? report.attachment_name ?? `${report.message_type} message`}
                </Text>
                <Text style={[styles.previewMeta, { color: theme.textSecondary }]}>
                  From {report.author_name ?? 'Bloke member'} · Reported by {report.reporter_name ?? 'Bloke member'}
                </Text>
              </View>

              {report.details ? (
                <View style={styles.detailsBlock}>
                  <Text style={[styles.previewLabel, { color: theme.textMuted }]}>Details</Text>
                  <Text style={[styles.detailsText, { color: theme.textSecondary }]}>{report.details}</Text>
                </View>
              ) : null}

              <View style={styles.actions}>
                {REVIEW_ACTIONS.map((action) => (
                  <Pressable
                    accessibilityRole="button"
                    disabled={updatingReportId === report.id}
                    key={action.status}
                    onPress={() => handleReview(report.id, action.status)}
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: action.status === 'resolved' ? theme.accent : theme.card,
                        borderColor: action.status === 'resolved' ? theme.accent : theme.border,
                        opacity: updatingReportId === report.id ? 0.6 : 1,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.actionText,
                        { color: action.status === 'resolved' ? theme.accentText : theme.textPrimary },
                      ]}>
                      {action.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </GlassCard>
          ))
        )}
      </ScrollView>
    </AppScreen>
  );
}

function formatReason(reason: string) {
  return reason.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  notice: {
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  emptyBody: {
    fontSize: 15,
    fontWeight: '700',
  },
  reportTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  reportIcon: {
    alignItems: 'center',
    borderRadius: 16,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  reportTitleBlock: {
    flex: 1,
    gap: 2,
  },
  reportTitle: {
    fontSize: typography.body,
    fontWeight: '900',
  },
  reportMeta: {
    fontSize: 13,
    fontWeight: '800',
  },
  messagePreview: {
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  previewBody: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 23,
  },
  previewMeta: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  detailsBlock: {
    gap: spacing.xs,
  },
  detailsText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 110,
    paddingHorizontal: spacing.md,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '900',
  },
});
