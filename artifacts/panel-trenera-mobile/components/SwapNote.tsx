import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost } from "@/lib/api";
import { TextPromptModal } from "@/components/TextPromptModal";

interface SwapRow {
  id: string;
  exerciseId?: string; // set on exercise requests
  mealId?: string; // set on meal requests
  status: "pending" | "approved" | "rejected";
  replacementName: string | null;
  trainerNote: string | null;
}

export type SwapKind = "exercise" | "meal";

/** Under an exercise or a meal: ask the trainer for a substitute, and see the answer (the approved replacement applies to this client only). */
export function SwapNote({ kind, targetId }: { kind: SwapKind; targetId: string }) {
  const exerciseId = targetId; // used in test ids and keys below
  const KEY = [`client-${kind}-swaps`];
  const colors = useColors();
  const qc = useQueryClient();
  const [asking, setAsking] = useState(false);
  const { data } = useQuery<SwapRow[]>({ queryKey: KEY, queryFn: () => apiGet<SwapRow[]>(`/api/client/${kind}-swaps`) });
  const latest = (data ?? []).find((row) => (kind === "meal" ? row.mealId : row.exerciseId) === targetId); // newest first

  const ask = useMutation({
    mutationFn: (reason: string) => apiPost(`/api/client/${kind}-swaps`, kind === "meal" ? { mealId: targetId, reason } : { exerciseId: targetId, reason }),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAsking(false);
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (error: Error) => {
      setAsking(false);
      Alert.alert("Nie udało się wysłać prośby", error.message);
    },
  });

  return (
    <View style={{ marginTop: 6 }}>
      {latest?.status === "pending" ? (
        <Text style={{ fontSize: 12, color: colors.mutedForeground }} testID={`swap-pending-${exerciseId}`}>
          Czekasz na odpowiedź trenera w sprawie zamiennika
        </Text>
      ) : null}
      {latest?.status === "approved" ? (
        <View style={{ padding: 8, borderRadius: 8, backgroundColor: colors.accent }} testID={`swap-approved-${exerciseId}`}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>Zamiennik od trenera: {latest.replacementName}</Text>
          {latest.trainerNote ? <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{latest.trainerNote}</Text> : null}
        </View>
      ) : null}
      {latest?.status === "rejected" ? (
        <Text style={{ fontSize: 12, color: colors.mutedForeground }}>Trener zostawił {kind === "meal" ? "ten posiłek" : "to ćwiczenie"} bez zmian.{latest.trainerNote ? ` ${latest.trainerNote}` : ""}</Text>
      ) : null}
      {latest?.status !== "pending" ? (
        <Pressable onPress={() => setAsking(true)} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 }} testID={`button-ask-swap-${exerciseId}`}>
          <Ionicons name="swap-horizontal-outline" size={14} color={colors.primary} />
          <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.primary }}>Poproś o zamiennik</Text>
        </Pressable>
      ) : null}
      <TextPromptModal
        visible={asking}
        title={kind === "meal" ? "Zamiennik posiłku" : "Zamiennik ćwiczenia"}
        hint={kind === "meal" ? "Napisz krótko, dlaczego (np. alergia, nie mam składników). Trener odpowie, co zjeść zamiast tego posiłku." : "Napisz krótko, dlaczego (np. boli kolano, zajęta maszyna). Trener odpowie, co zrobić zamiast tego ćwiczenia."}
        placeholder="Powód…"
        submitLabel="Wyślij prośbę"
        busy={ask.isPending}
        onSubmit={(text) => ask.mutate(text)}
        onCancel={() => setAsking(false)}
      />
    </View>
  );
}
