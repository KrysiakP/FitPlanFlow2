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
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";

export default function ChatPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ clientId?: string }>();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);

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
          setShowChatOnMobile(true);
          // Mark as read
          markAsReadMutation.mutate(conversation.partnerId);
        } else {
          // Client not found, redirect to first conversation or chat home
          if (conversations.length > 0) {
            setLocation(`/chat/${conversations[0].clientId}`);
          }
        }
      } else {
        // No client selected, don't auto-select on mobile (let user choose)
        setShowChatOnMobile(false);
      }
    } else {
      // Client: auto-select trainer conversation
      const trainerConversation = conversations[0];
      if (trainerConversation) {
        setSelectedConversation(trainerConversation);
        setShowChatOnMobile(true);
        // Mark as read
        markAsReadMutation.mutate(trainerConversation.partnerId);
      }
    }
  }, [conversations, conversationsLoading, isTrainer, clientIdFromUrl]);

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowChatOnMobile(true);
    // Mark as read
    markAsReadMutation.mutate(conversation.partnerId);

    // Update URL for trainers
    if (isTrainer) {
      setLocation(`/chat/${conversation.clientId}`);
    }
  };

  const handleBackToList = () => {
    setShowChatOnMobile(false);
    setSelectedConversation(null);
    if (isTrainer) {
      setLocation("/chat");
    }
  };

  const handleSendMessage = (body: string) => {
    if (!selectedConversation || !user) return;

    // SECURITY: Only send recipientId and body - server derives senderId, trainerId, clientId from session
    const messageData = {
      recipientId: selectedConversation.partnerId,
      body,
      // These are only for cache invalidation, not sent to server
      trainerId: selectedConversation.trainerId,
      clientId: selectedConversation.clientId,
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
      {/* Mobile: Show either header with back button or main header */}
      <header className="border-b p-4 flex items-center gap-3">
        {showChatOnMobile && selectedConversation && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackToList}
            className="md:hidden shrink-0"
            data-testid="button-back-to-list"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <h1 className="text-2xl font-bold" data-testid="chat-title">
          {showChatOnMobile && selectedConversation ? (
            <span className="md:hidden">{selectedConversation.partnerName}</span>
          ) : null}
          <span className={showChatOnMobile && selectedConversation ? "hidden md:inline" : ""}>
            Wiadomości
          </span>
        </h1>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Conversations sidebar - hidden on mobile when chat is open */}
        <aside 
          className={`w-full md:w-80 border-r flex flex-col ${
            showChatOnMobile ? "hidden md:flex" : "flex"
          }`} 
          data-testid="conversations-sidebar"
        >
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

        {/* Message area - hidden on mobile when showing conversation list */}
        <main 
          className={`flex-1 flex flex-col min-h-0 ${
            !showChatOnMobile ? "hidden md:flex" : "flex"
          }`} 
          data-testid="message-area"
        >
          {selectedConversation ? (
            <>
              {/* Desktop header for conversation partner */}
              <div className="border-b p-4 hidden md:block shrink-0">
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

              <div className="shrink-0">
                <MessageComposer
                  onSend={handleSendMessage}
                  isSending={sendMessageMutation.isPending}
                />
              </div>
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
