import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPatch } from "@/lib/api";

interface PushNotificationHistory {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: PushNotificationHistory[];
  unreadCount: number;
}

const TYPE_ICON: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  plan_assigned: { name: "clipboard-outline", color: "#6366f1" },
  workout_reminder: { name: "barbell-outline", color: "#f59e0b" },
  new_message: { name: "chatbubble-outline", color: "#10b981" },
  invitation_accepted: { name: "person-add-outline", color: "#3b82f6" },
  payment: { name: "card-outline", color: "#ef4444" },
};

function getTypeIconConfig(type: string | null) {
  if (!type) return { name: "notifications-outline" as keyof typeof Ionicons.glyphMap, color: "#8b8fa8" };
  return TYPE_ICON[type] ?? { name: "notifications-outline" as keyof typeof Ionicons.glyphMap, color: "#8b8fa8" };
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "przed chwilą";
  if (diffMins < 60) return `${diffMins} min temu`;
  if (diffHours < 24) return `${diffHours} godz. temu`;
  if (diffDays === 1) return "wczoraj";
  if (diffDays < 7) return `${diffDays} dni temu`;
  return date.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

interface NotificationItemProps {
  item: PushNotificationHistory;
  colors: ReturnType<typeof useColors>;
  onPress: (id: string) => void;
}

function NotificationItem({ item, colors, onPress }: NotificationItemProps) {
  const { name: iconName, color: iconColor } = getTypeIconConfig(item.type);

  return (
    <Pressable
      onPress={() => onPress(item.id)}
      style={({ pressed }) => [
        styles.item,
        {
          backgroundColor: item.isRead ? colors.background : colors.primary + "0d",
          borderColor: colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
      testID={`notification-item-${item.id}`}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconColor + "18" }]}>
        <Ionicons name={iconName} size={22} color={iconColor} />
        {!item.isRead && (
          <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
        )}
      </View>
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text
            style={[
              styles.itemTitle,
              { color: colors.foreground, fontFamily: item.isRead ? "Inter_400Regular" : "Inter_600SemiBold" },
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={[styles.itemDate, { color: colors.mutedForeground }]}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
        <Text style={[styles.itemBody, { color: colors.mutedForeground }]} numberOfLines={2}>
          {item.body}
        </Text>
      </View>
    </Pressable>
  );
}

export default function NotificationHistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, refetch, isRefetching } = useQuery<NotificationsResponse>({
    queryKey: ["notification-history"],
    queryFn: () => apiGet<NotificationsResponse>("/api/notifications/mine"),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiPatch<PushNotificationHistory>(`/api/notifications/mine/${id}/read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notification-history"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiPatch<{ message: string }>("/api/notifications/mine/read-all", {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notification-history"] }),
  });

  const handlePress = useCallback(
    (id: string) => {
      const item = data?.notifications.find((n) => n.id === id);
      if (item && !item.isRead) {
        markReadMutation.mutate(id);
      }
    },
    [data, markReadMutation]
  );

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Powiadomienia</Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <Pressable
            onPress={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            style={styles.markAllBtn}
            testID="button-mark-all-read"
          >
            <Ionicons name="checkmark-done-outline" size={16} color={colors.primary} />
            <Text style={[styles.markAllText, { color: colors.primary }]}>Oznacz wszystkie</Text>
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="notifications-off-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Brak powiadomień</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Tutaj pojawią się powiadomienia o planach, treningach i wiadomościach.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem item={item} colors={colors} onPress={handlePress} />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  markAllText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  list: {
    paddingTop: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  itemContent: { flex: 1 },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },
  itemTitle: {
    fontSize: 15,
    flex: 1,
  },
  itemDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flexShrink: 0,
  },
  itemBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 78,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
