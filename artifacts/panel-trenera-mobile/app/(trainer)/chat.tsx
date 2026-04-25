import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkAsRead,
  type Conversation,
  type ChatMessage,
} from "@/hooks/useChat";
function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const hhmm = date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (isToday) return hhmm;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (isYesterday) return `wczoraj ${hhmm}`;
  return date.toLocaleDateString("pl-PL", { day: "numeric", month: "short" }) + `, ${hhmm}`;
}

function ConversationItem({
  conversation,
  onPress,
  colors,
}: {
  conversation: Conversation;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const initials = conversation.partnerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.convItem,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
      testID={`button-conversation-${conversation.partnerId}`}
    >
      <View style={[styles.convAvatar, { backgroundColor: colors.primary + "20" }]}>
        <Text style={[styles.convAvatarText, { color: colors.primary }]}>{initials}</Text>
      </View>
      <View style={styles.convInfo}>
        <Text style={[styles.convName, { color: colors.foreground }]} numberOfLines={1}>
          {conversation.partnerName}
        </Text>
        {conversation.lastMessage ? (
          <Text style={[styles.convLastMsg, { color: colors.mutedForeground }]} numberOfLines={1}>
            {conversation.lastMessage}
          </Text>
        ) : (
          <Text style={[styles.convLastMsg, { color: colors.mutedForeground }]}>
            Brak wiadomości
          </Text>
        )}
      </View>
      <View style={styles.convMeta}>
        {conversation.lastMessageAt && (
          <Text style={[styles.convTime, { color: colors.mutedForeground }]}>
            {formatMessageTime(conversation.lastMessageAt)}
          </Text>
        )}
        {conversation.unreadCount > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.unreadBadgeText}>
              {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function MessageBubble({
  message,
  isOwn,
  colors,
}: {
  message: ChatMessage;
  isOwn: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowOther]}>
      <View
        style={[
          styles.bubble,
          isOwn
            ? { backgroundColor: colors.primary }
            : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
        ]}
      >
        <Text style={[styles.bubbleText, { color: isOwn ? "#fff" : colors.foreground }]}>
          {message.body}
        </Text>
        <Text
          style={[
            styles.bubbleTime,
            { color: isOwn ? "rgba(255,255,255,0.65)" : colors.mutedForeground },
          ]}
        >
          {formatMessageTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

export default function TrainerChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: conversations = [], isLoading: convsLoading, refetch } = useConversations();

  const { data: messages = [], isLoading: msgsLoading } = useMessages(
    selected?.trainerId ?? null,
    selected?.clientId ?? null
  );

  const sendMutation = useSendMessage();
  const markReadMutation = useMarkAsRead();

  useEffect(() => {
    if (selected) {
      markReadMutation.mutate(selected.partnerId);
    }
  }, [selected?.partnerId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  function handleSelectConversation(conv: Conversation) {
    setSelected(conv);
    setInputText("");
  }

  function handleBack() {
    setSelected(null);
    setInputText("");
  }

  function handleSend() {
    const body = inputText.trim();
    if (!body || !selected || sendMutation.isPending) return;
    setInputText("");
    sendMutation.mutate({
      recipientId: selected.partnerId,
      body,
      trainerId: selected.trainerId,
      clientId: selected.clientId,
    });
  }

  if (selected) {
    return (
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View
          style={[
            styles.chatHeader,
            { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.background },
          ]}
        >
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            testID="button-back-to-conversations"
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </Pressable>
          <View style={[styles.avatarSmall, { backgroundColor: colors.primary + "20" }]}>
            <Ionicons name="person-outline" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.chatHeaderName, { color: colors.foreground }]}>
              {selected.partnerName}
            </Text>
            <Text style={[styles.chatHeaderRole, { color: colors.mutedForeground }]}>Klient</Text>
          </View>
        </View>

        {msgsLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.messageList, { paddingBottom: insets.bottom + 16 }]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <MessageBubble message={item} isOwn={item.senderId === user?.id} colors={colors} />
            )}
            ListEmptyComponent={
              <View style={styles.emptyMessages}>
                <Text style={[styles.emptyMessagesText, { color: colors.mutedForeground }]}>
                  Brak wiadomości. Napisz pierwszą wiadomość!
                </Text>
              </View>
            }
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        <View
          style={[
            styles.inputRow,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + 8,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
            ]}
            placeholder="Napisz wiadomość..."
            placeholderTextColor={colors.mutedForeground}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            testID="input-chat-message"
          />
          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim() || sendMutation.isPending}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: inputText.trim() ? colors.primary : colors.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
            testID="button-send-message"
          >
            {sendMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.listHeader,
          { paddingTop: topPad + 16, borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.listTitle, { color: colors.foreground }]}>Wiadomości</Text>
        {conversations.length > 0 && (
          <View style={[styles.countBadge, { backgroundColor: colors.primary + "1a" }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>
              {conversations.length}
            </Text>
          </View>
        )}
      </View>

      {convsLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={[styles.emptyBox, { paddingTop: 60 }]}>
          <Ionicons name="chatbubbles-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Brak konwersacji</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Konwersacje pojawią się tutaj, gdy klienci zaczną pisać wiadomości.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.convList, { paddingBottom: insets.bottom + 80 }]}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          {conversations.map((conv) => (
            <ConversationItem
              key={conv.partnerId}
              conversation={conv}
              onPress={() => handleSelectConversation(conv)}
              colors={colors}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  listTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  countBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  countText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  convList: { paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  convItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  convAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
  },
  convAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  convInfo: { flex: 1, gap: 2 },
  convName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  convLastMsg: { fontSize: 13, fontFamily: "Inter_400Regular" },
  convMeta: { alignItems: "flex-end", gap: 4 },
  convTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  unreadBadgeText: { color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold" },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  chatHeaderName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  chatHeaderRole: { fontSize: 12, fontFamily: "Inter_400Regular" },
  messageList: { paddingHorizontal: 16, paddingTop: 12, gap: 4 },
  bubbleRow: { marginVertical: 3 },
  bubbleRowOwn: { alignItems: "flex-end" },
  bubbleRowOther: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 21 },
  bubbleTime: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  emptyMessages: { flex: 1, paddingVertical: 40, alignItems: "center" },
  emptyMessagesText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    maxHeight: 120,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyBox: { flex: 1, alignItems: "center", gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
