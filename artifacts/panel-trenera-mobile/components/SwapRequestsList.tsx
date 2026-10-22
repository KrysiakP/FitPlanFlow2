import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPut } from "@/lib/api";
import { TextPromptModal } from "@/components/TextPromptModal";

interface Row {
  id: string;
  kind: "exercise" | "meal";
  client: string;
  what: string;
  reason: string;
}

const EXERCISES = ["trainer-exercise-swaps"];
const MEALS = ["trainer-meal-swaps"];
const name = (first: string | null, last: string | null) => [first, last].filter(Boolean).join(" ") || "Podopieczny";

/** The trainer's inbox of substitute requests (exercises and meals): approve with a replacement for that client, or leave it as it is. */
export function SwapRequestsList() {
  const colors = useColors();
  const qc = useQueryClient();
  const [answering, setAnswering] = useState<Row | null>(null);

  const exercises = useQuery({
    queryKey: EXERCISES,
    queryFn: () => apiGet<{ id: string; clientFirstName: string | null; clientLastName: string | null; exercise: string; reason: string }[]>("/api/trainer/exercise-swaps"),
  });
  const meals = useQuery({
    queryKey: MEALS,
    queryFn: () => apiGet<{ id: string; clientFirstName: string | null; clientLastName: string | null; meal: string; reason: string }[]>("/api/trainer/meal-swaps"),
  });
  const rows: Row[] = [
    ...(exercises.data ?? []).map((row): Row => ({ id: row.id, kind: "exercise", client: name(row.clientFirstName, row.clientLastName), what: row.exercise, reason: row.reason })),
    ...(meals.data ?? []).map((row): Row => ({ id: row.id, kind: "meal", client: name(row.clientFirstName, row.clientLastName), what: row.meal, reason: row.reason })),
  ];

  const answer = useMutation({
    mutationFn: (input: { row: Row; decision: "approve" | "reject"; replacementName?: string }) =>
      apiPut(`/api/trainer/${input.row.kind === "meal" ? "meal" : "exercise"}-swaps/${input.row.id}`, { decision: input.decision, replacementName: input.replacementName }),
    onSuccess: (_result, input) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAnswering(null);
      qc.invalidateQueries({ queryKey: input.row.kind === "meal" ? MEALS : EXERCISES });
    },
    onError: (error: Error) => {
      setAnswering(null);
      Alert.alert("Nie udało się zapisać odpowiedzi", error.message);
    },
  });

  if (rows.length === 0) return null;
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} testID="card-swap-requests">
      <Text style={[styles.title, { color: colors.foreground }]}>Prośby o zamiennik ({rows.length})</Text>
      {rows.map((row) => (
        <View key={row.id} style={styles.row} testID={`swap-request-${row.id}`}>
          <Text style={{ fontSize: 14, color: colors.foreground }}>
            <Text style={{ fontFamily: "Inter_600SemiBold" }}>{row.client}</Text> prosi o zamiennik {row.kind === "meal" ? "posiłku" : "ćwiczenia"}: <Text style={{ fontFamily: "Inter_600SemiBold" }}>{row.what}</Text>
          </Text>
          <Text style={{ fontSize: 13, color: colors.mutedForeground }}>„{row.reason}”</Text>
          <View style={styles.actions}>
            <Pressable onPress={() => setAnswering(row)} accessibilityRole="button" style={[styles.btn, { backgroundColor: colors.primary }]} testID={`button-approve-${row.id}`}>
              <Text style={{ color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" }}>Zatwierdź</Text>
            </Pressable>
            <Pressable onPress={() => answer.mutate({ row, decision: "reject" })} disabled={answer.isPending} accessibilityRole="button" style={[styles.btn, { borderWidth: 1, borderColor: colors.border }]} testID={`button-reject-${row.id}`}>
              <Text style={{ color: colors.foreground, fontSize: 13, fontFamily: "Inter_500Medium" }}>Zostaw bez zmian</Text>
            </Pressable>
          </View>
        </View>
      ))}
      <TextPromptModal
        visible={answering !== null}
        title={answering?.kind === "meal" ? "Posiłek zastępczy" : "Ćwiczenie zastępcze"}
        hint={answering ? `${answering.client}: ${answering.what}. Zamiennik dotyczy tylko tego podopiecznego.` : undefined}
        placeholder={answering?.kind === "meal" ? "Np. jajecznica z warzywami" : "Np. przysiad na suwnicy"}
        submitLabel="Zatwierdź"
        minLength={2}
        maxLength={255}
        busy={answer.isPending}
        onSubmit={(text) => answering && answer.mutate({ row: answering, decision: "approve", replacementName: text })}
        onCancel={() => setAnswering(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20, gap: 12 },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  row: { gap: 4, paddingTop: 8 },
  actions: { flexDirection: "row", gap: 8, marginTop: 6 },
  btn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
});
