import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  FileText,
  Flag,
  MapPin,
  MessageCircle,
  Send,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingScreen } from '@/components/LoadingScreen';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { demoChapterChatChannels, demoChapterChatMessages } from '@/lib/demoData';
import { useAuth } from '@/context/AuthContext';
import { borderRadius, shadows, spacing, typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';
import {
  MESSAGE_TYPES,
  REPORT_REASONS,
  ChapterChatChannel,
  ChapterChatMessage,
  ChapterChatMessageType,
  ChapterChatReportReason,
  createChapterChatMessage,
  deleteChapterChatMessage,
  fetchChapterChatMessages,
  fetchMyChapterChatChannels,
  getChannelTypeLabel,
  reportChapterChatMessage,
} from '@/lib/supabase/messages';

type ComposerType = NonNullable<ChapterChatMessageType>;

export default function MessagesScreen() {
  const theme = useTheme();
  const { isDemoMode, isLoading: isAuthLoading, profile, session } = useAuth();
  const params = useLocalSearchParams<{ channelId?: string }>();
  const initialChannelId = Array.isArray(params.channelId) ? params.channelId[0] : params.channelId;
  const scrollRef = useRef<ScrollView>(null);
  const [channels, setChannels] = useState<ChapterChatChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(initialChannelId ?? null);
  const [messages, setMessages] = useState<ChapterChatMessage[]>([]);
  const [messageType, setMessageType] = useState<ComposerType>('text');
  const [body, setBody] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [locationLatitude, setLocationLatitude] = useState('');
  const [locationLongitude, setLocationLongitude] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [reportingMessage, setReportingMessage] = useState<ChapterChatMessage | null>(null);
  const [reportReason, setReportReason] = useState<ChapterChatReportReason>('other');
  const [reportDetails, setReportDetails] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedChannelId) ?? null,
    [channels, selectedChannelId],
  );
  const canSend = Boolean(selectedChannel && !selectedChannel.is_read_only);

  const loadChannels = useCallback(async () => {
    setErrorMessage('');
    setIsLoadingChannels(true);

    if (isDemoMode || !supabase) {
      setChannels(demoChapterChatChannels);
      setSelectedChannelId((current) => {
        if (initialChannelId && demoChapterChatChannels.some((channel) => channel.id === initialChannelId)) return initialChannelId;
        if (current && demoChapterChatChannels.some((channel) => channel.id === current)) return current;
        return demoChapterChatChannels[0]?.id ?? null;
      });
      setIsLoadingChannels(false);
      return;
    }

    try {
      const { data, error } = await fetchMyChapterChatChannels();
      if (error) throw new Error(error);

      setChannels(data);
      setSelectedChannelId((current) => {
        if (initialChannelId && data.some((channel) => channel.id === initialChannelId)) return initialChannelId;
        if (current && data.some((channel) => channel.id === current)) return current;
        return data[0]?.id ?? null;
      });
    } catch (error) {
      setChannels([]);
      setErrorMessage(error instanceof Error ? error.message : 'Could not load chapter chats.');
    } finally {
      setIsLoadingChannels(false);
    }
  }, [initialChannelId, isDemoMode]);

  const loadMessages = useCallback(async () => {
    if (!selectedChannelId) {
      setMessages([]);
      return;
    }

    setErrorMessage('');
    setSavedMessage('');
    setIsLoadingMessages(true);

    if (isDemoMode || !supabase) {
      setMessages(demoChapterChatMessages.filter((message) => message.channel_id === selectedChannelId));
      setIsLoadingMessages(false);
      return;
    }

    try {
      const { data, error } = await fetchChapterChatMessages(selectedChannelId);
      if (error) throw new Error(error);
      setMessages(data);
    } catch (error) {
      setMessages([]);
      setErrorMessage(error instanceof Error ? error.message : 'Could not load messages.');
    } finally {
      setIsLoadingMessages(false);
    }
  }, [isDemoMode, selectedChannelId]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  function resetComposer() {
    setBody('');
    setAttachmentUrl('');
    setAttachmentName('');
    setLocationLabel('');
    setLocationLatitude('');
    setLocationLongitude('');
    setMessageType('text');
  }

  async function handleSend() {
    if (!selectedChannel || !session || isSending) return;

    const trimmedBody = body.trim();
    const trimmedAttachmentUrl = attachmentUrl.trim();
    const trimmedAttachmentName = attachmentName.trim();
    const trimmedLocationLabel = locationLabel.trim();
    const latitude = locationLatitude.trim() ? Number(locationLatitude.trim()) : null;
    const longitude = locationLongitude.trim() ? Number(locationLongitude.trim()) : null;

    if (!canSend) {
      setErrorMessage('Only chapter leaders and admins can post in announcements.');
      return;
    }

    if (messageType === 'text' && !trimmedBody) {
      setErrorMessage('Write a message first.');
      return;
    }

    if ((messageType === 'photo' || messageType === 'file') && !/^https?:\/\//i.test(trimmedAttachmentUrl)) {
      setErrorMessage('Add a full http or https attachment URL.');
      return;
    }

    if (messageType === 'location') {
      const hasCoordinates = latitude !== null && longitude !== null && Number.isFinite(latitude) && Number.isFinite(longitude);
      if (!trimmedLocationLabel && !hasCoordinates) {
        setErrorMessage('Add a location label or coordinates.');
        return;
      }
    }

    setErrorMessage('');
    setSavedMessage('');
    setIsSending(true);

    const now = new Date().toISOString();

    try {
      if (isDemoMode || !supabase) {
        const demoMessage: ChapterChatMessage = {
          attachment_mime_type: messageType === 'photo' ? 'image/jpeg' : messageType === 'file' ? 'application/octet-stream' : null,
          attachment_name: trimmedAttachmentName || null,
          attachment_size: null,
          attachment_url: trimmedAttachmentUrl || null,
          author_avatar_url: profile?.avatar_url ?? null,
          author_id: session.user.id,
          author_name: profile?.full_name ?? 'Demo Leader',
          body: trimmedBody || null,
          can_delete: selectedChannel.can_moderate,
          channel_id: selectedChannel.id,
          chapter_id: selectedChannel.chapter_id,
          created_at: now,
          id: `demo-message-${Date.now()}`,
          location_label: trimmedLocationLabel || null,
          location_latitude: latitude,
          location_longitude: longitude,
          message_type: messageType,
          moderation_status: 'visible',
        };
        setMessages((current) => [...current, demoMessage]);
      } else {
        const { error } = await createChapterChatMessage({
          attachment_mime_type:
            messageType === 'photo' ? 'image/jpeg' : messageType === 'file' ? 'application/octet-stream' : null,
          attachment_name: trimmedAttachmentName || null,
          attachment_url: trimmedAttachmentUrl || null,
          author_id: session.user.id,
          body: trimmedBody || null,
          channel_id: selectedChannel.id,
          location_label: trimmedLocationLabel || null,
          location_latitude: latitude,
          location_longitude: longitude,
          message_type: messageType,
        });

        if (error) throw new Error(error);
        await loadMessages();
        await loadChannels();
      }

      resetComposer();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not send message.');
    } finally {
      setIsSending(false);
    }
  }

  async function handleDeleteMessage(message: ChapterChatMessage) {
    if (!message.can_delete) return;

    setErrorMessage('');
    setSavedMessage('');

    try {
      if (isDemoMode || !supabase) {
        setMessages((current) => current.filter((item) => item.id !== message.id));
      } else {
        const { error } = await deleteChapterChatMessage(message.id);
        if (error) throw new Error(error);
        await loadMessages();
      }
      setSavedMessage('Message removed.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not delete message.');
    }
  }

  async function handleReportMessage() {
    if (!reportingMessage || isReporting) return;

    setErrorMessage('');
    setSavedMessage('');
    setIsReporting(true);

    try {
      if (!(isDemoMode || !supabase)) {
        const { error } = await reportChapterChatMessage(reportingMessage.id, reportReason, reportDetails.trim() || null);
        if (error) throw new Error(error);
      }

      setReportingMessage(null);
      setReportDetails('');
      setReportReason('other');
      setSavedMessage('Report sent for admin review.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not report message.');
    } finally {
      setIsReporting(false);
    }
  }

  function handleUseCurrentLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setErrorMessage('Location sharing is not available on this device.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationLatitude(String(Number(position.coords.latitude.toFixed(6))));
        setLocationLongitude(String(Number(position.coords.longitude.toFixed(6))));
        setMessageType('location');
        setErrorMessage('');
      },
      () => setErrorMessage('Could not read your current location.'),
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 },
    );
  }

  if (isAuthLoading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Redirect href="/welcome" />;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={theme.isDark ? ['#070605', '#15120F', '#070605'] : ['#F6F1E8', '#FFF9EF', '#E9DED0']}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={[styles.iconButton, { backgroundColor: theme.glass, borderColor: theme.border }]}>
          <ArrowLeft color={theme.textPrimary} size={21} strokeWidth={2.6} />
        </Pressable>
        <View style={styles.topTitleBlock}>
          <Text style={[styles.eyebrow, { color: theme.accent }]}>Chapter messages</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Chats</Text>
        </View>
        <Pressable
          accessibilityLabel="Refresh chats"
          accessibilityRole="button"
          onPress={loadChannels}
          style={[styles.iconButton, { backgroundColor: theme.glass, borderColor: theme.border }]}>
          <MessageCircle color={theme.textPrimary} size={21} strokeWidth={2.6} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {errorMessage ? <Text style={[styles.notice, { color: theme.error }]}>{errorMessage}</Text> : null}
        {savedMessage ? <Text style={[styles.notice, { color: theme.success }]}>{savedMessage}</Text> : null}

        {isLoadingChannels ? (
          <View style={[styles.loadingCard, { backgroundColor: theme.glass, borderColor: theme.border }]}>
            <ActivityIndicator color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading chats...</Text>
          </View>
        ) : channels.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.glass, borderColor: theme.border }, shadows.card]}>
            <Users color={theme.accent} size={28} strokeWidth={2.5} />
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No chapter chats yet</Text>
            <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
              Join an active chapter to open its member channels.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/community')}
              style={[styles.primaryButton, { backgroundColor: theme.accent, borderColor: theme.accent }]}>
              <Text style={[styles.primaryButtonText, { color: theme.accentText }]}>Find Chapters</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.channelRail}>
              {channels.map((channel) => {
                const selected = channel.id === selectedChannelId;
                const ChannelIcon = getChannelIcon(channel.channel_type);

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={channel.id}
                    onPress={() => setSelectedChannelId(channel.id)}
                    style={[
                      styles.channelChip,
                      {
                        backgroundColor: selected ? theme.cardInverted : theme.glass,
                        borderColor: selected ? theme.accentBorder : theme.border,
                      },
                    ]}>
                    <ChannelIcon color={selected ? theme.accent : theme.textMuted} size={18} strokeWidth={2.5} />
                    <View style={styles.channelChipCopy}>
                      <Text
                        numberOfLines={1}
                        style={[styles.channelChipTitle, { color: selected ? theme.textInverse : theme.textPrimary }]}>
                        {channel.name}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.channelChipMeta, { color: selected ? theme.textInverseMuted : theme.textSecondary }]}>
                        {channel.chapter_name}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            {selectedChannel ? (
              <View style={[styles.chatShell, { backgroundColor: theme.glass, borderColor: theme.border }, shadows.card]}>
                <View style={[styles.channelHeader, { borderBottomColor: theme.border }]}>
                  <View style={styles.channelHeaderCopy}>
                    <Text style={[styles.channelTitle, { color: theme.textPrimary }]}>{selectedChannel.name}</Text>
                    <Text style={[styles.channelMeta, { color: theme.textSecondary }]}>
                      {getChannelTypeLabel(selectedChannel.channel_type)} · {selectedChannel.chapter_name}
                    </Text>
                  </View>
                  {selectedChannel.can_moderate ? (
                    <View style={[styles.moderatorPill, { backgroundColor: theme.accentSurface, borderColor: theme.accentBorder }]}>
                      <ShieldCheck color={theme.accent} size={14} strokeWidth={2.5} />
                      <Text style={[styles.moderatorText, { color: theme.accentText }]}>Moderator</Text>
                    </View>
                  ) : null}
                </View>

                <ScrollView
                  contentContainerStyle={styles.messageList}
                  onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                  ref={scrollRef}
                  showsVerticalScrollIndicator={false}>
                  {isLoadingMessages ? (
                    <View style={styles.inlineLoading}>
                      <ActivityIndicator color={theme.accent} />
                    </View>
                  ) : messages.length === 0 ? (
                    <Text style={[styles.emptyThread, { color: theme.textSecondary }]}>No messages yet.</Text>
                  ) : (
                    messages.map((message) => (
                      <MessageBubble
                        currentUserId={session?.user.id}
                        key={message.id}
                        message={message}
                        onDelete={handleDeleteMessage}
                        onReport={setReportingMessage}
                      />
                    ))
                  )}
                </ScrollView>

                <View style={[styles.composer, { borderTopColor: theme.border }]}>
                  {selectedChannel.is_read_only ? (
                    <Text style={[styles.readOnlyText, { color: theme.textSecondary }]}>
                      Announcements are read-only for members.
                    </Text>
                  ) : null}

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRail}>
                    {MESSAGE_TYPES.map((type) => {
                      const selected = messageType === type.value;

                      return (
                        <Pressable
                          accessibilityRole="button"
                          disabled={!canSend}
                          key={type.value}
                          onPress={() => setMessageType(type.value)}
                          style={[
                            styles.typeChip,
                            {
                              backgroundColor: selected ? theme.accent : theme.card,
                              borderColor: selected ? theme.accent : theme.border,
                              opacity: canSend ? 1 : 0.5,
                            },
                          ]}>
                          <Text style={[styles.typeChipText, { color: selected ? theme.accentText : theme.textSecondary }]}>
                            {type.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  <TextInput
                    accessibilityLabel="Message"
                    editable={canSend}
                    multiline
                    onChangeText={setBody}
                    placeholder={getComposerPlaceholder(messageType)}
                    placeholderTextColor={theme.textMuted}
                    style={[
                      styles.messageInput,
                      { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary, opacity: canSend ? 1 : 0.55 },
                    ]}
                    textAlignVertical="top"
                    value={body}
                  />

                  {messageType === 'photo' || messageType === 'file' ? (
                    <View style={styles.attachmentGrid}>
                      <TextInput
                        accessibilityLabel="Attachment URL"
                        autoCapitalize="none"
                        editable={canSend}
                        onChangeText={setAttachmentUrl}
                        placeholder={messageType === 'photo' ? 'Photo URL' : 'File URL'}
                        placeholderTextColor={theme.textMuted}
                        style={[styles.attachmentInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
                        value={attachmentUrl}
                      />
                      <TextInput
                        accessibilityLabel="Attachment name"
                        editable={canSend}
                        onChangeText={setAttachmentName}
                        placeholder="Attachment name"
                        placeholderTextColor={theme.textMuted}
                        style={[styles.attachmentInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
                        value={attachmentName}
                      />
                    </View>
                  ) : null}

                  {messageType === 'location' ? (
                    <View style={styles.locationGrid}>
                      <TextInput
                        accessibilityLabel="Location label"
                        editable={canSend}
                        onChangeText={setLocationLabel}
                        placeholder="Location label"
                        placeholderTextColor={theme.textMuted}
                        style={[styles.attachmentInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
                        value={locationLabel}
                      />
                      <View style={styles.coordinateRow}>
                        <TextInput
                          accessibilityLabel="Latitude"
                          editable={canSend}
                          keyboardType="numeric"
                          onChangeText={setLocationLatitude}
                          placeholder="Latitude"
                          placeholderTextColor={theme.textMuted}
                          style={[styles.coordinateInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
                          value={locationLatitude}
                        />
                        <TextInput
                          accessibilityLabel="Longitude"
                          editable={canSend}
                          keyboardType="numeric"
                          onChangeText={setLocationLongitude}
                          placeholder="Longitude"
                          placeholderTextColor={theme.textMuted}
                          style={[styles.coordinateInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.textPrimary }]}
                          value={locationLongitude}
                        />
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        disabled={!canSend}
                        onPress={handleUseCurrentLocation}
                        style={[styles.secondaryButton, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <MapPin color={theme.textPrimary} size={17} strokeWidth={2.5} />
                        <Text style={[styles.secondaryButtonText, { color: theme.textPrimary }]}>Use Current Location</Text>
                      </Pressable>
                    </View>
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    disabled={!canSend || isSending}
                    onPress={handleSend}
                    style={[
                      styles.sendButton,
                      {
                        backgroundColor: theme.accent,
                        borderColor: theme.accent,
                        opacity: canSend && !isSending ? 1 : 0.55,
                      },
                    ]}>
                    {isSending ? <ActivityIndicator color={theme.accentText} /> : <Send color={theme.accentText} size={18} strokeWidth={2.5} />}
                    <Text style={[styles.sendButtonText, { color: theme.accentText }]}>Send</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </>
        )}
      </View>

      <ReportModal
        details={reportDetails}
        isReporting={isReporting}
        message={reportingMessage}
        onClose={() => setReportingMessage(null)}
        onDetailsChange={setReportDetails}
        onReasonChange={setReportReason}
        onSubmit={handleReportMessage}
        reason={reportReason}
      />
    </SafeAreaView>
  );
}

function MessageBubble({
  currentUserId,
  message,
  onDelete,
  onReport,
}: {
  currentUserId?: string;
  message: ChapterChatMessage;
  onDelete: (message: ChapterChatMessage) => void;
  onReport: (message: ChapterChatMessage) => void;
}) {
  const theme = useTheme();
  const isMine = message.author_id === currentUserId;
  const alignStyle = isMine ? styles.mineBubbleWrap : styles.otherBubbleWrap;
  const bubbleColor = isMine ? theme.cardInverted : theme.card;
  const textColor = isMine ? theme.textInverse : theme.textPrimary;
  const secondaryColor = isMine ? theme.textInverseMuted : theme.textSecondary;
  const authorName = message.author_name ?? 'Bloke member';

  return (
    <View style={[styles.bubbleWrap, alignStyle]}>
      <View style={[styles.bubbleRow, isMine ? styles.mineBubbleRow : styles.otherBubbleRow]}>
        {!isMine ? <UserAvatar imageUrl={message.author_avatar_url} name={authorName} size={34} /> : null}
        <View style={[styles.bubble, { backgroundColor: bubbleColor, borderColor: isMine ? theme.accentBorder : theme.border }]}>
          <View style={styles.bubbleTop}>
            <Text style={[styles.authorName, { color: secondaryColor }]}>{authorName}</Text>
            <Text style={[styles.messageTime, { color: secondaryColor }]}>{formatTime(message.created_at)}</Text>
          </View>

          {message.body ? <Text style={[styles.messageBody, { color: textColor }]}>{message.body}</Text> : null}

          <MessageAttachment message={message} isMine={isMine} />

          {message.moderation_status === 'reported' ? (
            <Text style={[styles.reportedText, { color: theme.warning }]}>Reported</Text>
          ) : null}

          <View style={styles.messageActions}>
            {!isMine ? (
              <Pressable accessibilityRole="button" onPress={() => onReport(message)} style={styles.messageAction}>
                <Flag color={secondaryColor} size={15} strokeWidth={2.5} />
                <Text style={[styles.messageActionText, { color: secondaryColor }]}>Report</Text>
              </Pressable>
            ) : null}
            {message.can_delete ? (
              <Pressable accessibilityRole="button" onPress={() => onDelete(message)} style={styles.messageAction}>
                <Trash2 color={secondaryColor} size={15} strokeWidth={2.5} />
                <Text style={[styles.messageActionText, { color: secondaryColor }]}>Delete</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        {isMine ? <UserAvatar imageUrl={message.author_avatar_url} name={authorName} size={34} /> : null}
      </View>
    </View>
  );
}

function MessageAttachment({ isMine, message }: { isMine: boolean; message: ChapterChatMessage }) {
  const theme = useTheme();
  const foreground = isMine ? theme.textInverse : theme.textPrimary;
  const muted = isMine ? theme.textInverseMuted : theme.textSecondary;

  if (message.message_type === 'photo' && message.attachment_url) {
    return (
      <Pressable accessibilityRole="imagebutton" onPress={() => Linking.openURL(message.attachment_url!)}>
        <Image accessibilityIgnoresInvertColors source={{ uri: message.attachment_url }} style={styles.messageImage} />
      </Pressable>
    );
  }

  if (message.message_type === 'file' && message.attachment_url) {
    return (
      <Pressable
        accessibilityRole="link"
        onPress={() => Linking.openURL(message.attachment_url!)}
        style={[styles.fileAttachment, { borderColor: isMine ? theme.accentBorder : theme.border }]}>
        <FileText color={foreground} size={20} strokeWidth={2.5} />
        <View style={styles.fileCopy}>
          <Text style={[styles.fileName, { color: foreground }]}>{message.attachment_name ?? 'Attachment'}</Text>
          <Text style={[styles.fileMeta, { color: muted }]}>{formatFileSize(message.attachment_size)}</Text>
        </View>
      </Pressable>
    );
  }

  if (message.message_type === 'location') {
    const hasCoordinates = message.location_latitude !== null && message.location_longitude !== null;
    const url = hasCoordinates
      ? `https://maps.google.com/?q=${message.location_latitude},${message.location_longitude}`
      : null;

    return (
      <Pressable
        accessibilityRole={url ? 'link' : 'button'}
        disabled={!url}
        onPress={() => (url ? Linking.openURL(url) : undefined)}
        style={[styles.fileAttachment, { borderColor: isMine ? theme.accentBorder : theme.border }]}>
        <MapPin color={foreground} size={20} strokeWidth={2.5} />
        <View style={styles.fileCopy}>
          <Text style={[styles.fileName, { color: foreground }]}>{message.location_label ?? 'Shared location'}</Text>
          {hasCoordinates ? (
            <Text style={[styles.fileMeta, { color: muted }]}>
              {message.location_latitude}, {message.location_longitude}
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  }

  return null;
}

function ReportModal({
  details,
  isReporting,
  message,
  onClose,
  onDetailsChange,
  onReasonChange,
  onSubmit,
  reason,
}: {
  details: string;
  isReporting: boolean;
  message: ChapterChatMessage | null;
  onClose: () => void;
  onDetailsChange: (details: string) => void;
  onReasonChange: (reason: ChapterChatReportReason) => void;
  onSubmit: () => void;
  reason: ChapterChatReportReason;
}) {
  const theme = useTheme();

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={Boolean(message)}>
      <View style={[styles.modalBackdrop, { backgroundColor: theme.overlay }]}>
        <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }, shadows.lift]}>
          <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Report message</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRail}>
            {REPORT_REASONS.map((item) => {
              const selected = reason === item.value;

              return (
                <Pressable
                  accessibilityRole="button"
                  key={item.value}
                  onPress={() => onReasonChange(item.value)}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: selected ? theme.accent : theme.cardMuted,
                      borderColor: selected ? theme.accent : theme.border,
                    },
                  ]}>
                  <Text style={[styles.typeChipText, { color: selected ? theme.accentText : theme.textSecondary }]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <TextInput
            accessibilityLabel="Report details"
            multiline
            onChangeText={onDetailsChange}
            placeholder="Details"
            placeholderTextColor={theme.textMuted}
            style={[styles.reportInput, { backgroundColor: theme.cardMuted, borderColor: theme.border, color: theme.textPrimary }]}
            textAlignVertical="top"
            value={details}
          />
          <View style={styles.modalActions}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={[styles.modalButton, { backgroundColor: theme.cardMuted, borderColor: theme.border }]}>
              <Text style={[styles.modalButtonText, { color: theme.textPrimary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isReporting}
              onPress={onSubmit}
              style={[styles.modalButton, { backgroundColor: theme.accent, borderColor: theme.accent, opacity: isReporting ? 0.65 : 1 }]}>
              <Text style={[styles.modalButtonText, { color: theme.accentText }]}>
                {isReporting ? 'Sending...' : 'Send Report'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function getComposerPlaceholder(messageType: ComposerType) {
  if (messageType === 'photo') return 'Caption';
  if (messageType === 'file') return 'Context for the file';
  if (messageType === 'location') return 'Context for the location';
  return 'Message your chapter';
}

function getChannelIcon(channelType: ChapterChatChannel['channel_type']) {
  if (channelType === 'announcements') return Bell;
  if (channelType === 'event') return MapPin;
  if (channelType === 'small_group') return Users;
  return MessageCircle;
}

function formatTime(value?: string | null) {
  if (!value) return '';

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatFileSize(value?: number | null) {
  if (!value) return 'File';
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  topTitleBlock: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: typography.title,
    fontWeight: '900',
    letterSpacing: 0,
  },
  content: {
    flex: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  notice: {
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20,
    paddingHorizontal: spacing.xs,
  },
  loadingCard: {
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '900',
  },
  emptyCard: {
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '900',
  },
  channelRail: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  channelChip: {
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 66,
    paddingHorizontal: spacing.md,
    width: 230,
  },
  channelChipCopy: {
    flex: 1,
    gap: 2,
  },
  channelChipTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  channelChipMeta: {
    fontSize: 12,
    fontWeight: '800',
  },
  chatShell: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  channelHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  channelHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  channelTitle: {
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 26,
  },
  channelMeta: {
    fontSize: 13,
    fontWeight: '800',
  },
  moderatorPill: {
    alignItems: 'center',
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  moderatorText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  messageList: {
    gap: spacing.md,
    padding: spacing.md,
  },
  inlineLoading: {
    padding: spacing.lg,
  },
  emptyThread: {
    fontSize: 15,
    fontWeight: '800',
    padding: spacing.lg,
    textAlign: 'center',
  },
  bubbleWrap: {
    width: '100%',
  },
  bubbleRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.sm,
    maxWidth: '100%',
  },
  mineBubbleRow: {
    justifyContent: 'flex-end',
  },
  otherBubbleRow: {
    justifyContent: 'flex-start',
  },
  mineBubbleWrap: {
    alignItems: 'flex-end',
  },
  otherBubbleWrap: {
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flexShrink: 1,
    gap: spacing.sm,
    maxWidth: '82%',
    padding: spacing.md,
  },
  bubbleTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  authorName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
  },
  messageTime: {
    fontSize: 12,
    fontWeight: '800',
  },
  messageBody: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
  reportedText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  messageActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  messageAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  messageActionText: {
    fontSize: 12,
    fontWeight: '900',
  },
  messageImage: {
    aspectRatio: 1.35,
    borderRadius: borderRadius.md,
    width: 260,
  },
  fileAttachment: {
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  fileCopy: {
    flex: 1,
    gap: 2,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '900',
  },
  fileMeta: {
    fontSize: 12,
    fontWeight: '800',
  },
  composer: {
    borderTopWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  readOnlyText: {
    fontSize: 13,
    fontWeight: '900',
  },
  typeRail: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  typeChip: {
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '900',
  },
  messageInput: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
    maxHeight: 112,
    minHeight: 56,
    padding: spacing.md,
  },
  attachmentGrid: {
    gap: spacing.sm,
  },
  attachmentInput: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    fontSize: 15,
    fontWeight: '700',
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  locationGrid: {
    gap: spacing.sm,
  },
  coordinateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  coordinateInput: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 50,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '900',
  },
  sendButton: {
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 54,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '900',
  },
  modalBackdrop: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    gap: spacing.md,
    maxWidth: 560,
    padding: spacing.lg,
    width: '100%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
  },
  reportInput: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
    minHeight: 112,
    padding: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  modalButton: {
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
    minWidth: 130,
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '900',
  },
});
