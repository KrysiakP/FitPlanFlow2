import { useMutation, useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { Bell } from "lucide-react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { notificationLink } from "@/lib/notificationLink";

interface HistoryItem {
  id: string;
  title: string;
  body: string;
  type: string | null;
  isRead: boolean;
  createdAt: string;
}

const KEY = ["/api/notifications/mine"];

/** The client's notification history on the web: the same feed the app shows, with a way to open what it is about. */
export function ClientNotificationsBell() {
  const [, setLocation] = useLocation();
  const { data } = useQuery<{ notifications: HistoryItem[]; unreadCount: number }>({ queryKey: KEY, refetchInterval: 60000 });
  const items = data?.notifications ?? [];
  const unread = data?.unreadCount ?? 0;
  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });

  const markRead = useMutation({ mutationFn: async (id: string) => apiRequest("PATCH", `/api/notifications/mine/${id}/read`), onSuccess: refresh });
  const markAll = useMutation({ mutationFn: async () => apiRequest("PATCH", "/api/notifications/mine/read-all"), onSuccess: refresh });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread > 0 ? `Powiadomienia, nieprzeczytane: ${unread}` : "Powiadomienia"}
          data-testid="button-client-notifications"
        >
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-xs" data-testid="badge-client-notification-count">
              {unread > 99 ? "99+" : unread}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80" data-testid="dropdown-client-notifications">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Powiadomienia</span>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-auto p-1 text-xs" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
              Oznacz wszystkie
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[400px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Brak powiadomień</div>
          ) : (
            items.map((item) => (
              <DropdownMenuItem
                key={item.id}
                className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${item.isRead ? "" : "bg-primary/5"}`}
                onClick={() => {
                  if (!item.isRead) markRead.mutate(item.id);
                  const link = notificationLink(item.type, "client");
                  if (link) setLocation(link);
                }}
                data-testid={`client-notification-${item.id}`}
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-none mb-1">{item.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.body}</p>
                  </div>
                  {!item.isRead && <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" aria-label="Nieprzeczytane" />}
                </div>
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: pl })}</p>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
