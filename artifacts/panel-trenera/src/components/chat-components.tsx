import { useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Bookmark, X, ImagePlus } from "lucide-react";
import { chatImageProblem, uploadChatImage } from "@/lib/chatImage";
import { useToast } from "@/hooks/use-toast";
import { addTemplate, DEFAULT_TEMPLATES, insertTemplate, loadCustomTemplates, saveCustomTemplates } from "@/lib/chatTemplates";
import type { Message } from "@shared/schema";
import type { Conversation } from "@/hooks/use-chat";
import { lastReadOwnMessageId } from "@/lib/readReceipt";

interface ConversationListProps {
  conversations: Conversation[];
  selectedPartnerId: string | null;
  onSelectConversation: (conversation: Conversation) => void;
  isLoading: boolean;
}

export function ConversationList({
  conversations,
  selectedPartnerId,
  onSelectConversation,
  isLoading,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="conversations-loading">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-4" data-testid="conversations-empty">
        <p className="text-sm text-muted-foreground text-center">
          Brak konwersacji
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-1 p-2" data-testid="conversations-list">
        {conversations.map((conversation) => (
          <Card
            key={conversation.partnerId}
            className={`p-3 cursor-pointer transition-colors hover-elevate active-elevate-2 ${
              selectedPartnerId === conversation.partnerId
                ? "toggle-elevate toggle-elevated"
                : ""
            }`}
            onClick={() => onSelectConversation(conversation)}
            data-testid={`conversation-item-${conversation.partnerId}`}
          >
            <div className="flex items-start gap-3">
              <Avatar data-testid={`avatar-${conversation.partnerId}`}>
                <AvatarImage src={conversation.partnerAvatar || undefined} />
                <AvatarFallback>
                  {conversation.partnerName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3
                    className="font-semibold text-sm truncate"
                    data-testid={`conversation-name-${conversation.partnerId}`}
                  >
                    {conversation.partnerName}
                  </h3>
                  {conversation.unreadCount > 0 && (
                    <Badge
                      variant="default"
                      className="shrink-0"
                      data-testid={`unread-badge-${conversation.partnerId}`}
                    >
                      {conversation.unreadCount}
                    </Badge>
                  )}
                </div>
                {conversation.lastMessage && (
                  <p
                    className="text-xs text-muted-foreground truncate"
                    data-testid={`last-message-${conversation.partnerId}`}
                  >
                    {conversation.lastMessage}
                  </p>
                )}
                {conversation.lastMessageAt && (
                  <p
                    className="text-xs text-muted-foreground mt-1"
                    data-testid={`last-message-time-${conversation.partnerId}`}
                  >
                    {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                      addSuffix: true,
                      locale: pl,
                    })}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

interface MessageHistoryProps {
  messages: Message[];
  currentUserId: string;
  partnerName: string;
  isLoading: boolean;
  onLoadOlder?: () => void; // set when the list may be cut off at the start
}

export function MessageHistory({
  messages,
  currentUserId,
  partnerName,
  isLoading,
  onLoadOlder,
}: MessageHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  // Detect manual scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  const readMarkId = lastReadOwnMessageId(messages, currentUserId);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center h-full"
        data-testid="messages-loading"
      >
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-full p-4"
        data-testid="messages-empty"
      >
        <p className="text-sm text-muted-foreground text-center">
          Brak wiadomości. Wyślij pierwszą wiadomość do {partnerName}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4"
      data-testid="messages-history"
    >
      {onLoadOlder && (
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={onLoadOlder} data-testid="button-load-older">
            Wczytaj starsze wiadomości
          </Button>
        </div>
      )}
      {messages.map((message) => {
        const isOwnMessage = message.senderId === currentUserId;
        const showReceipt = message.id === readMarkId;
        return (
          <div
            key={message.id}
            className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
            data-testid={`message-${message.id}`}
          >
            <Card
              className={`max-w-[70%] min-w-0 p-3 ${
                isOwnMessage
                  ? "bg-primary text-primary-foreground"
                  : ""
              }`}
              data-testid={`message-card-${message.id}`}
            >
              {message.attachmentUrl && (
                <a href={message.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block mb-2" data-testid={`message-image-link-${message.id}`}>
                  <img
                    src={message.attachmentUrl}
                    alt="Zdjęcie w wiadomości"
                    loading="lazy"
                    className="max-h-64 w-auto max-w-full rounded-md object-cover"
                    data-testid={`message-image-${message.id}`}
                  />
                </a>
              )}
              {message.body && (
                <p
                  className="text-sm whitespace-pre-wrap [overflow-wrap:anywhere]"
                  data-testid={`message-body-${message.id}`}
                >
                  {message.body}
                </p>
              )}
              <p
                className={`text-xs mt-2 ${
                  isOwnMessage
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                }`}
                data-testid={`message-time-${message.id}`}
              >
                {formatDistanceToNow(new Date(message.createdAt), {
                  addSuffix: true,
                  locale: pl,
                })}
                {showReceipt && (
                  <span data-testid={`message-read-${message.id}`}> · Przeczytano</span>
                )}
              </p>
            </Card>
          </div>
        );
      })}
    </div>
  );
}

interface MessageComposerProps {
  onSend: (body: string, attachmentUrl?: string) => Promise<void> | void;
  isSending: boolean;
  disabled?: boolean;
  /** Trainers get ready-made replies above the box (defaults plus their own, kept in this browser). */
  quickReplies?: boolean;
}

export function MessageComposer({
  onSend,
  isSending,
  disabled = false,
  quickReplies = false,
}: MessageComposerProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  // an image already uploaded and waiting to be sent with the message
  const [image, setImage] = useState<{ objectPath: string; previewUrl: string | null } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [custom, setCustom] = useState<string[]>(() => (quickReplies ? loadCustomTemplates() : []));
  const updateCustom = (next: string[]) => {
    setCustom(next);
    saveCustomTemplates(next);
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const problem = chatImageProblem(file);
    if (problem) {
      toast({ title: "Nie można wysłać tego pliku", description: problem, variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      setImage(await uploadChatImage(file));
    } catch (error) {
      toast({ title: "Nie udało się przesłać zdjęcia", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if ((!trimmed && !image) || isSending || uploading) return;
    try {
      await onSend(trimmed, image?.objectPath);
      // Only clear once the send actually succeeded — on failure, keep the
      // text so the trainer/client doesn't lose what they typed.
      setMessage("");
      setImage(null);
    } catch {
      // onSend already surfaces an error toast; leave the text in place.
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t">
      {quickReplies && (
        <div className="flex flex-wrap items-center gap-2 px-4 pt-3" data-testid="quick-replies">
          {[...DEFAULT_TEMPLATES, ...custom].map((template) => {
            const isCustom = custom.includes(template);
            return (
              <span key={template} className="inline-flex items-center rounded-full border text-xs">
                <button
                  type="button"
                  className="px-3 py-1 hover-elevate rounded-full text-left max-w-[16rem] truncate"
                  title={template}
                  onClick={() => setMessage((current) => insertTemplate(current, template))}
                  disabled={disabled || isSending}
                >
                  {template}
                </button>
                {isCustom && (
                  <button type="button" aria-label="Usuń szablon" className="pr-2" onClick={() => updateCustom(custom.filter((item) => item !== template))}>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            );
          })}
          {message.trim() && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              onClick={() => updateCustom(addTemplate(custom, message))}
              data-testid="button-save-template"
            >
              <Bookmark className="w-3 h-3" />
              Zapisz jako szablon
            </button>
          )}
        </div>
      )}
    {image && (
      <div className="flex items-center gap-3 px-4 pt-3" data-testid="chat-image-preview">
        {image.previewUrl && <img src={image.previewUrl} alt="Wybrane zdjęcie" className="h-16 w-16 rounded-md object-cover" />}
        <span className="text-sm text-muted-foreground">Zdjęcie dołączone do wiadomości</span>
        <Button type="button" variant="ghost" size="icon" aria-label="Usuń zdjęcie" onClick={() => setImage(null)} data-testid="button-remove-chat-image">
          <X className="w-4 h-4" />
        </Button>
      </div>
    )}
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 p-4"
      data-testid="message-composer"
    >
      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handleFile} data-testid="input-chat-image" />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Dodaj zdjęcie"
        onClick={() => fileInput.current?.click()}
        disabled={disabled || isSending || uploading}
        data-testid="button-add-chat-image"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
      </Button>
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Napisz wiadomość..."
        className="resize-none min-h-[60px] max-h-[120px]"
        disabled={disabled || isSending}
        data-testid="input-message"
      />
      <Button
        type="submit"
        size="icon"
        disabled={(!message.trim() && !image) || isSending || uploading || disabled}
        data-testid="button-send-message"
      >
        {isSending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </Button>
    </form>
    </div>
  );
}
