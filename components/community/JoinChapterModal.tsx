import { AlertTriangle, LockKeyhole, Send } from 'lucide-react-native';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppPressButton } from '@/components/AppPressButton';
import { FormTextInput } from '@/components/FormTextInput';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { DirectoryChapter } from '@/types/chapters';

export type ChapterJoinAction =
  | { chapter: DirectoryChapter; type: 'open' }
  | { chapter: DirectoryChapter; type: 'invite'; inviteCode?: string }
  | { chapter: DirectoryChapter; type: 'request'; message?: string };

type JoinChapterModalProps = {
  action: ChapterJoinAction | null;
  alreadyInDifferentChapter: boolean;
  errorMessage?: string;
  inviteCode: string;
  isSaving?: boolean;
  message: string;
  onCancel: () => void;
  onChangeInviteCode: (value: string) => void;
  onChangeMessage: (value: string) => void;
  onConfirm: () => void;
};

function getTitle(action: ChapterJoinAction) {
  if (action.type === 'open') return 'Join chapter';
  if (action.type === 'request') return 'Request to join';
  return 'Enter invite code';
}

function getButtonLabel(action: ChapterJoinAction, isSaving?: boolean) {
  if (isSaving) return 'Working...';
  if (action.type === 'open') return 'Join Now';
  if (action.type === 'request') return 'Submit Request';
  return 'Join with Invite Code';
}

export function JoinChapterModal({
  action,
  alreadyInDifferentChapter,
  errorMessage,
  inviteCode,
  isSaving,
  message,
  onCancel,
  onChangeInviteCode,
  onChangeMessage,
  onConfirm,
}: JoinChapterModalProps) {
  const theme = useTheme();

  if (!action) {
    return null;
  }

  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={Boolean(action)}>
      <View style={[styles.backdrop, { backgroundColor: theme.overlay }]}>
        <Pressable accessibilityLabel="Close join chapter dialog" style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={[styles.modal, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.eyebrow, { color: theme.accent }]}>Chapter discovery</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{getTitle(action)}</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            {action.chapter.name}
            {alreadyInDifferentChapter
              ? ' is different from your current chapter. Confirm before joining or requesting.'
              : ' will stay scoped to chapter accountability.'}
          </Text>

          {alreadyInDifferentChapter ? (
            <View style={[styles.warning, { backgroundColor: theme.accentSurface, borderColor: theme.accentBorder }]}>
              <AlertTriangle color={theme.warning} size={20} strokeWidth={2.7} />
              <Text style={[styles.warningText, { color: theme.textPrimary }]}>
                For MVP, this does not remove your old membership automatically.
              </Text>
            </View>
          ) : null}

          {action.type === 'invite' ? (
            <FormTextInput
              autoCapitalize="characters"
              label="Invite code"
              onChangeText={onChangeInviteCode}
              placeholder="BLOKE-XXXX"
              value={inviteCode}
            />
          ) : null}

          {action.type === 'request' ? (
            <FormTextInput
              label="Message"
              multiline
              onChangeText={onChangeMessage}
              placeholder="Optional note to the facilitator"
              style={styles.messageInput}
              textAlignVertical="top"
              value={message}
            />
          ) : null}

          {errorMessage ? <Text style={[styles.error, { color: theme.error }]}>{errorMessage}</Text> : null}

          <View style={styles.actions}>
            <View style={styles.actionButton}>
              <AppPressButton label="Cancel" onPress={onCancel} variant="secondary" />
            </View>
            <View style={styles.actionButton}>
              <AppPressButton
                disabled={isSaving}
                icon={action.type === 'invite' ? LockKeyhole : Send}
                label={getButtonLabel(action, isSaving)}
                onPress={onConfirm}
                variant="accent"
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modal: {
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.md,
    maxWidth: 560,
    padding: spacing.xl,
    width: '100%',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  body: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 25,
  },
  warning: {
    alignItems: 'flex-start',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
  },
  messageInput: {
    minHeight: 104,
  },
  error: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    minWidth: 180,
  },
});
