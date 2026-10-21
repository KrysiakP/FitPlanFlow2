import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { apiDelete, apiGet, apiPost } from "@/lib/api";

type Announcement = { id: string; title: string; body: string; createdAt: string };

const formatDate = (value: string) =>
  new Date(value).toLocaleString("pl-PL", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

export default function GymAnnouncements() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data, isLoading, refetch, isRefetching } = useQuery<Announcement[]>({
    queryKey: ["gym-announcements"],
    queryFn: () => apiGet("/api/gym/announcements"),
  });

  const sendMutation = useMutation({
    mutationFn: () => apiPost<{ notifiedTrainers: number }>("/api/gym/announcements", { title: title.trim(), body: body.trim() }),
    onSuccess: (result) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTitle("");
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["gym-announcements"] });
      Alert.alert(
        "Ogłoszenie wysłane",
        result.notifiedTrainers > 0
          ? `Powiadomiliśmy trenerów: ${result.notifiedTrainers}.`
          : "Nie masz jeszcze aktywnych trenerów — zobaczą je po dołączeniu.",
      );
    },
    onError: () => Alert.alert("Nie udało się wysłać", "Sprawdź tytuł i treść, a potem spróbuj ponownie."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/gym/announcements/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["gym-announcements"] }),
    onError: () => Alert.alert("Błąd", "Nie udało się usunąć ogłoszenia."),
  });

  function confirmDelete(item: Announcement) {
    Alert.alert("Usunąć ogłoszenie?", `„${item.title}" zniknie z listy trenerów.`, [
      { text: "Anuluj", style: "cancel" },
      { text: "Usuń", style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
    ]);
  }

  const canSend = title.trim().length > 0 && body.trim().length > 0 && !sendMutation.isPending;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Nowe ogłoszenie</Text>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Wiadomość trafi jako powiadomienie do wszystkich aktywnych trenerów studia.
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Tytuł"
          placeholderTextColor={colors.mutedForeground}
          maxLength={150}
          style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
          testID="input-announcement-title"
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Treść ogłoszenia"
          placeholderTextColor={colors.mutedForeground}
          maxLength={2000}
          multiline
          style={[styles.input, styles.textArea, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
          testID="input-announcement-body"
        />
        <Pressable
          onPress={() => sendMutation.mutate()}
          disabled={!canSend}
          style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: canSend ? 1 : 0.5 }]}
          testID="button-send-announcement"
        >
          {sendMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>Wyślij ogłoszenie</Text>}
        </Pressable>

        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 24 }]}>Wysłane</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (data ?? []).length === 0 ? (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>Nie wysłano jeszcze żadnych ogłoszeń.</Text>
        ) : (
          (data ?? []).map((item) => (
            <View key={item.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
                <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>{item.body}</Text>
                <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>{formatDate(item.createdAt)}</Text>
              </View>
              <Pressable
                onPress={() => confirmDelete(item)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Usuń ogłoszenie"
                testID={`button-delete-announcement-${item.id}`}
              >
                <Ionicons name="trash-outline" size={20} color={colors.destructive} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  hint: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: "Inter_400Regular" },
  textArea: { minHeight: 110, textAlignVertical: "top" },
  sendBtn: { height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sendText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  card: { flexDirection: "row", gap: 12, borderWidth: 1, borderRadius: 14, padding: 14 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  cardBody: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 4, lineHeight: 20 },
  cardDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 6 },
});
