import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkAsRead,
  useWebSocket,
  type Conversation,
} from "@/hooks/use-chat";
import {
  ConversationList,
  MessageHistory,
  MessageComposer,
} from "@/components/chat-components";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function ChatPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ clientId?: string }>();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  const isTrainer = user?.role === "trainer";
  const clientIdFromUrl = params.clientId;

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useConversations();

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = useMessages(
    selectedConversation?.trainerId || null,
    selectedConversation?.clientId || null
  );

  // Send message mutation
  const sendMessageMutation = useSendMessage();

  // Mark as read mutation
  const markAsReadMutation = useMarkAsRead();

  // Connect to WebSocket
  useWebSocket(user || null);

  // Select conversation based on URL or default
  useEffect(() => {
    if (conversationsLoading || !conversations.length) return;

    if (isTrainer) {
      // Trainer: select conversation based on URL parameter
      if (clientIdFromUrl) {
        const conversation = conversations.find((c) => c.clientId === clientIdFromUrl);
        if (conversation) {
          setSelectedConversation(conversation);
          // Mark as read
          markAsReadMutation.mutate(conversation.partnerId);
        } else {
          // Client not found, redirect to first conversation or chat home
          if (conversations.length > 0) {
            setLocation(`/chat/${conversations[0].clientId}`);
          }
        }
      } else {
        // No client selected, select first conversation
        if (conversations.length > 0) {
          setLocation(`/chat/${conversations[0].clientId}`);
        }
      }
    } else {
      // Client: auto-select trainer conversation
      const trainerConversation = conversations[0];
      if (trainerConversation) {
        setSelectedConversation(trainerConversation);
        // Mark as read
        markAsReadMutation.mutate(trainerConversation.partnerId);
      }
    }
  }, [conversations, conversationsLoading, isTrainer, clientIdFromUrl]);

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    // Mark as read
    markAsReadMutation.mutate(conversation.partnerId);

    // Update URL for trainers
    if (isTrainer) {
      setLocation(`/chat/${conversation.clientId}`);
    }
  };

  const handleSendMessage = (body: string) => {
    if (!selectedConversation || !user) return;

    const messageData = {
      trainerId: selectedConversation.trainerId,
      clientId: selectedConversation.clientId,
      senderId: user.id,
      recipientId: selectedConversation.partnerId,
      body,
    };

    sendMessageMutation.mutate(messageData);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="chat-unauthorized">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" data-testid="chat-page">
      <header className="border-b p-4">
        <h1 className="text-2xl font-bold" data-testid="chat-title">
          Wiadomości
        </h1>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Conversations sidebar */}
        <aside className="w-80 border-r flex flex-col" data-testid="conversations-sidebar">
          <div className="p-4 border-b">
            <h2 className="font-semibold" data-testid="conversations-title">
              {isTrainer ? "Podopieczni" : "Trener"}
            </h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <ConversationList
              conversations={conversations}
              selectedPartnerId={selectedConversation?.partnerId || null}
              onSelectConversation={handleSelectConversation}
              isLoading={conversationsLoading}
            />
          </div>
        </aside>

        {/* Message area */}
        <main className="flex-1 flex flex-col" data-testid="message-area">
          {selectedConversation ? (
            <>
              <div className="border-b p-4">
                <h2 className="font-semibold" data-testid="conversation-partner-name">
                  {selectedConversation.partnerName}
                </h2>
              </div>

              <MessageHistory
                messages={messages}
                currentUserId={user.id}
                partnerName={selectedConversation.partnerName}
                isLoading={messagesLoading}
              />

              <MessageComposer
                onSend={handleSendMessage}
                isSending={sendMessageMutation.isPending}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full" data-testid="no-conversation-selected">
              <p className="text-muted-foreground">
                {conversationsLoading
                  ? "Ładowanie..."
                  : conversations.length === 0
                  ? "Brak konwersacji"
                  : "Wybierz konwersację"}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
