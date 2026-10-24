import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";

export interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  trainerId: string;
  clientId: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  recipientId: string;
  trainerId: string;
  clientId: string;
  body: string;
  attachmentUrl?: string | null; // an image: /objects/uploads/<uuid> (or a local file while it is being sent)
  createdAt: string;
  readAt: string | null;
}

export function useConversations() {
  return useQuery<Conversation[]>({
    queryKey: ["chat-conversations"],
    queryFn: () => apiGet<Conversation[]>("/api/chat/conversations"),
    refetchInterval: 10_000,
  });
}

// A conversation loads its latest messages; "load older" raises the limit for that conversation (the query key stays the same,
// because the optimistic updates below address it exactly)
const MESSAGE_PAGE = 200;
const messageLimits = new Map<string, number>();
export const messageLimit = (trainerId: string | null, clientId: string | null) => messageLimits.get(`${trainerId}:${clientId}`) ?? MESSAGE_PAGE;

export function useLoadOlderMessages() {
  const qc = useQueryClient();
  return (trainerId: string | null, clientId: string | null) => {
    messageLimits.set(`${trainerId}:${clientId}`, messageLimit(trainerId, clientId) + MESSAGE_PAGE);
    return qc.invalidateQueries({ queryKey: ["chat-messages", trainerId, clientId] });
  };
}

export function useMessages(trainerId: string | null, clientId: string | null) {
  return useQuery<ChatMessage[]>({
    queryKey: ["chat-messages", trainerId, clientId],
    queryFn: () => apiGet<ChatMessage[]>(`/api/chat/messages/${trainerId}/${clientId}?limit=${messageLimit(trainerId, clientId)}`),
    enabled: !!trainerId && !!clientId,
    refetchInterval: 5_000,
  });
}

export function useUnreadCount() {
  return useQuery<{ count: number }>({
    queryKey: ["chat-unread-count"],
    queryFn: () => apiGet<{ count: number }>("/api/chat/unread-count"),
    refetchInterval: 15_000,
  });
}

interface SendMessageVars {
  recipientId: string;
  body: string;
  attachmentUrl?: string; // an uploaded image (object path)
  attachmentPreview?: string; // the local file, shown until the real message arrives
  trainerId: string;
  clientId: string;
  senderId: string;
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SendMessageVars) =>
      apiPost<ChatMessage>("/api/chat/messages", {
        recipientId: data.recipientId,
        body: data.body,
        ...(data.attachmentUrl ? { attachmentUrl: data.attachmentUrl } : {}),
      }),

    onMutate: async (variables) => {
      const queryKey = ["chat-messages", variables.trainerId, variables.clientId];
      await qc.cancelQueries({ queryKey });
      const previousMessages = qc.getQueryData<ChatMessage[]>(queryKey);

      const optimisticMessage: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        senderId: variables.senderId,
        recipientId: variables.recipientId,
        trainerId: variables.trainerId,
        clientId: variables.clientId,
        body: variables.body,
        attachmentUrl: variables.attachmentPreview ?? null,
        createdAt: new Date().toISOString(),
        readAt: null,
      };

      qc.setQueryData<ChatMessage[]>(queryKey, (old) => [
        ...(old ?? []),
        optimisticMessage,
      ]);

      return { previousMessages, queryKey };
    },

    onError: (_err, _variables, context) => {
      if (context) {
        qc.setQueryData(context.queryKey, context.previousMessages);
      }
    },

    onSuccess: (realMessage, variables) => {
      const queryKey = ["chat-messages", variables.trainerId, variables.clientId];
      qc.setQueryData<ChatMessage[]>(queryKey, (old) => {
        if (!old) return [realMessage];
        const withoutOptimistic = old.filter((m) => !m.id.startsWith("optimistic-"));
        return [...withoutOptimistic, realMessage];
      });
    },

    onSettled: (_data, _err, variables) => {
      qc.invalidateQueries({
        queryKey: ["chat-messages", variables.trainerId, variables.clientId],
      });
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (partnerId: string) => apiPost<void>("/api/chat/mark-read", { partnerId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
      qc.invalidateQueries({ queryKey: ["chat-unread-count"] });
    },
  });
}
