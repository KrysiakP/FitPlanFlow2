import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useEffect, useRef, useState } from "react";
import type { Message, User } from "@shared/schema";

// Conversation type returned by API
export interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  trainerId: string;
  clientId: string;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
}

// Hook to fetch conversations
export function useConversations() {
  return useQuery<Conversation[]>({
    queryKey: ["/api/chat/conversations"],
  });
}

// Hook to fetch messages for a specific conversation
export function useMessages(trainerId: string | null, clientId: string | null) {
  return useQuery<Message[]>({
    queryKey: ["/api/chat/messages", trainerId, clientId],
    enabled: !!trainerId && !!clientId,
  });
}

// Hook to send a message
export function useSendMessage() {
  return useMutation({
    mutationFn: async (data: {
      trainerId: string;
      clientId: string;
      senderId: string;
      recipientId: string;
      body: string;
    }) => {
      const res = await apiRequest("POST", "/api/chat/messages", data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate conversations list
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
      // Invalidate messages for this conversation
      queryClient.invalidateQueries({
        queryKey: ["/api/chat/messages", variables.trainerId, variables.clientId],
      });
    },
  });
}

// Hook to mark conversation as read
export function useMarkAsRead() {
  return useMutation({
    mutationFn: async (partnerId: string) => {
      const res = await apiRequest("POST", "/api/chat/mark-read", { partnerId });
      return res.json();
    },
    onSuccess: () => {
      // Invalidate conversations to update unread count
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/unread-count"] });
    },
  });
}

// Hook to fetch unread message count
export function useUnreadCount() {
  return useQuery<{ count: number }>({
    queryKey: ["/api/chat/unread-count"],
  });
}

// Hook for WebSocket connection
export function useWebSocket(user: User | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (!user) return;

    const connect = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws/chat`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("WebSocket connected");
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === "new_message") {
              const message = data.data as Message;
              
              // Invalidate conversations to update last message and unread count
              queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
              
              // Invalidate messages for this conversation
              queryClient.invalidateQueries({
                queryKey: ["/api/chat/messages", message.trainerId, message.clientId],
              });
              
              // Invalidate unread count
              queryClient.invalidateQueries({ queryKey: ["/api/chat/unread-count"] });
            }
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
        };

        ws.onclose = () => {
          console.log("WebSocket disconnected");
          setIsConnected(false);
          wsRef.current = null;

          // Attempt to reconnect with exponential backoff
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              connect();
            }, delay);
          }
        };

        wsRef.current = ws;
      } catch (error) {
        console.error("Error creating WebSocket:", error);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user]);

  return { isConnected };
}
