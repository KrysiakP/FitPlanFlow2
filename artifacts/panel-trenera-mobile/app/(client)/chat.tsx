import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useEffect, useRef } from "react";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkAsRead,
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

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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
        <Text style={[styles.bubbleTime, { color: isOwn ? "rgba(255,255,255,0.65)" : colors.mutedForeground }]}>
          {formatMessageTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

export default function ClientChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = Platform.OS === "web" ? 84 : 49;
  const { user } = useAuth();
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const { data: conversations, isLoading: convsLoading } = useConversations();
  const conversation = conversations?.[0] ?? null;

  const { data: messages = [], isLoading: msgsLoading } = useMessages(
    conversation?.trainerId ?? null,
    conversation?.clientId ?? null
  );

  const sendMutation = useSendMessage();
  const markReadMutation = useMarkAsRead();

  useEffect(() => {
    if (conversation?.partnerId) {
      markReadMutation.mutate(conversation.partnerId);
    }
  }, [conversation?.partnerId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  function handleSend() {
    const body = inputText.trim();
    if (!body || !conversation || !user || sendMutation.isPending) return;
    setInputText("");
    sendMutation.mutate(
      {
        recipientId: conversation.partnerId,
        body,
        trainerId: conversation.trainerId,
        clientId: conversation.clientId,
        senderId: user.id,
      },
      { onError: () => setInputText(body) }
    );
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const isLoading = convsLoading || (!!conversation && msgsLoading);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // No trainer relationship at all
  if (!conversation) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <View style={[styles.emptyIconBox, { backgroundColor: colors.primary + "14" }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={36} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Brak trenera</Text>
        <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
          Gdy trener zaprosi Cię do współpracy, tutaj będziesz mógł się z nim kontaktować.
        </Text>
      </View>
    );
  }

  const trainerInitials = getInitials(conversation.partnerName);
  const hasMessages = messages.length > 0;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Chat header */}
      <View style={[styles.chatHeader, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <View style={[styles.avatarSmall, { backgroundColor: colors.primary + "20" }]}>
          <Text style={[styles.avatarSmallText, { color: colors.primary }]}>{trainerInitials}</Text>
        </View>
        <View>
          <Text style={[styles.chatHeaderName, { color: colors.foreground }]}>
            {conversation.partnerName}
          </Text>
          <Text style={[styles.chatHeaderRole, { color: colors.mutedForeground }]}>Trener</Text>
        </View>
      </View>

      {/* Messages list */}
      <FlatList
        ref={flatListRef}
        style={styles.messageList}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.messageListContent,
          { paddingBottom: 16 },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isOwn={item.senderId === user?.id}
            colors={colors}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyMessages}>
            <View style={[styles.emptyIconBox, { backgroundColor: colors.primary + "12" }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyMessagesTitle, { color: colors.foreground }]}>
              Napisz do {conversation.partnerName.split(" ")[0]}
            </Text>
            <Text style={[styles.emptyMessagesText, { color: colors.mutedForeground }]}>
              Masz pytanie o plan, dietę lub trening?{"\n"}Twój trener jest tutaj, żeby pomóc.
            </Text>
          </View>
        }
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Input row */}
      <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: colors.background, paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 8 }]}>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
          ]}
          placeholder={hasMessages ? "Napisz wiadomość..." : `Napisz do ${conversation.partnerName.split(" ")[0]}...`}
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 36,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarSmallText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  chatHeaderName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  chatHeaderRole: { fontSize: 12, fontFamily: "Inter_400Regular" },
  messageList: { flex: 1, paddingHorizontal: 16 },
  messageListContent: { paddingTop: 12, gap: 4, flexGrow: 1 },
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
  emptyMessages: {
    flex: 1,
    paddingVertical: 48,
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyMessagesTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyMessagesText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
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
});
