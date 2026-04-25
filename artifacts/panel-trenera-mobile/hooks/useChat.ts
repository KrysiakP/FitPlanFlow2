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

export function useMessages(trainerId: string | null, clientId: string | null) {
  return useQuery<ChatMessage[]>({
    queryKey: ["chat-messages", trainerId, clientId],
    queryFn: () => apiGet<ChatMessage[]>(`/api/chat/messages/${trainerId}/${clientId}`),
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

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { recipientId: string; body: string; trainerId: string; clientId: string }) =>
      apiPost<ChatMessage>("/api/chat/messages", { recipientId: data.recipientId, body: data.body }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
      qc.invalidateQueries({ queryKey: ["chat-messages", variables.trainerId, variables.clientId] });
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
