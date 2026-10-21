import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { apiPost } from "@/lib/api";

export interface AttentionItem {
  clientId: string;
  name: string;
  score: number;
  reasons: { type: string; label: string }[];
}

const REASON_STYLE: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  overdue_payment: { icon: "alert-circle-outline", color: "#ef4444" },
  no_plan: { icon: "clipboard-outline", color: "#6366f1" },
  inactive: { icon: "moon-outline", color: "#f59e0b" },
  never_trained: { icon: "hourglass-outline", color: "#f59e0b" },
  new_report: { icon: "document-text-outline", color: "#10b981" },
};

/** The few clients who need the trainer today, most urgent first. */
export function AttentionList({ items, limit = 5 }: { items: AttentionItem[]; limit?: number }) {
  const colors = useColors();
  const [reminded, setReminded] = useState<Set<string>>(new Set());

  const remindMutation = useMutation({
    mutationFn: (clientId: string) => apiPost<{ sent: number }>(`/api/trainer/clients/${clientId}/remind`, {}),
    onSuccess: (result, clientId) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setReminded((prev) => new Set(prev).add(clientId));
      if (result?.sent === 0) {
        Alert.alert("Przypomnienie zapisane", "Ten podopieczny nie ma włączonych powiadomień push, więc zobaczy je dopiero w aplikacji.");
      }
    },
    onError: () => Alert.alert("Nie udało się wysłać", "Podopieczny może mieć wyłączone powiadomienia. Spróbuj ponownie później."),
  });

  if (items.length === 0) return null;
  const shown = items.slice(0, limit);

  return (
    <View style={{ marginBottom: 20 }} testID="section-attention">
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.foreground }]}>Wymaga uwagi</Text>
        <View style={[styles.badge, { backgroundColor: colors.primary + "1a" }]}>
          <Text style={{ color: colors.primary, fontSize: 12, fontFamily: "Inter_700Bold" }}>{items.length}</Text>
        </View>
      </View>
      {shown.map((item) => {
        const canRemind = item.reasons.some((r) => r.type === "inactive" || r.type === "never_trained");
        const wasReminded = reminded.has(item.clientId);
        const isSending = remindMutation.isPending && remindMutation.variables === item.clientId;
        return (
        <Pressable
          key={item.clientId}
          onPress={() => router.push(`/client/${item.clientId}`)}
          style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={`${item.name}: ${item.reasons.map((r) => r.label).join(", ")}`}
          testID={`attention-${item.clientId}`}
        >
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
            {item.reasons.map((reason) => {
              const style = REASON_STYLE[reason.type] ?? { icon: "ellipse-outline" as const, color: colors.mutedForeground };
              return (
                <View key={reason.type} style={styles.reasonRow}>
                  <Ionicons name={style.icon} size={15} color={style.color} />
                  <Text style={[styles.reason, { color: colors.mutedForeground }]}>{reason.label}</Text>
                </View>
              );
            })}
            {canRemind && (
              <Pressable
                onPress={() => remindMutation.mutate(item.clientId)}
                disabled={wasReminded || isSending}
                accessibilityRole="button"
                accessibilityLabel={wasReminded ? "Przypomnienie wysłane" : `Przypomnij o treningu: ${item.name}`}
                style={[styles.remindBtn, { borderColor: colors.primary, opacity: wasReminded ? 0.6 : 1 }]}
                testID={`button-attention-remind-${item.clientId}`}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name={wasReminded ? "checkmark" : "notifications-outline"} size={14} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                      {wasReminded ? "Przypomnienie wysłane" : "Przypomnij o treningu"}
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
        </Pressable>
        );
      })}
      {items.length > shown.length && (
        <Pressable onPress={() => router.push("/clients")} accessibilityRole="button" testID="button-attention-all">
          <Text style={[styles.more, { color: colors.primary }]}>I jeszcze {items.length - shown.length} — zobacz podopiecznych</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  badge: { minWidth: 24, paddingHorizontal: 8, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  card: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 8 },
  name: { fontSize: 15, fontFamily: "Inter_700Bold" },
  reasonRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  reason: { fontSize: 13, fontFamily: "Inter_500Medium" },
  remindBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginTop: 2 },
  more: { fontSize: 13, fontFamily: "Inter_600SemiBold", paddingVertical: 4 },
});
