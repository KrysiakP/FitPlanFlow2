import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { ClientCard } from "@/components/ClientCard";
import { apiGet, apiPost } from "@/lib/api";

interface ClientWithPlan {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  assignment?: {
    plan?: { id: string; name: string } | null;
  } | null;
}

export default function TrainerClientsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [remindAllModalVisible, setRemindAllModalVisible] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const topPad = insets.top;

  const { data, isLoading, refetch, isRefetching } = useQuery<ClientWithPlan[]>({
    queryKey: ["trainer-clients"],
    queryFn: () => apiGet<ClientWithPlan[]>("/api/trainer/clients"),
    enabled: !!user?.id,
  });

  const remindAllMutation = useMutation({
    mutationFn: (message: string) =>
      apiPost<{ sent: number; total: number }>(
        "/api/trainer/clients/remind-all",
        message.trim() ? { message: message.trim() } : {}
      ),
    onSuccess: (res) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRemindAllModalVisible(false);
      setBroadcastMessage("");
      const detail =
        res.sent > 0
          ? `Próba wysyłki do ${res.total} podopiecznych. Dostarczono ${res.sent} powiadomień push.`
          : `Wysłano do ${res.total} podopiecznych, ale żaden nie ma skonfigurowanych powiadomień push.`;
      Alert.alert("Przypomnienia wysłane", detail);
    },
    onError: () => {
      Alert.alert("Błąd", "Nie udało się wysłać przypomnień.");
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (clientEmail: string) =>
      apiPost<{ id: string }>("/api/invitations/send", { clientEmail }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitations"] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setInviteModalVisible(false);
      setInviteEmail("");
      setInviteError(null);
    },
    onError: (err: Error) => {
      const msg = err?.message ?? "";
      if (msg.includes("401") || msg.toLowerCase().includes("unauthorized")) {
        setInviteError("Sesja wygasła. Zaloguj się ponownie.");
      } else if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("już")) {
        setInviteError("Ten klient już otrzymał zaproszenie lub jest Twoim podopiecznym.");
      } else {
        setInviteError("Nie udało się wysłać zaproszenia. Spróbuj ponownie.");
      }
    },
  });

  function handleInviteOpen() {
    setInviteEmail("");
    setInviteError(null);
    setInviteModalVisible(true);
  }

  function handleInviteSend() {
    const trimmed = inviteEmail.trim();
    if (!trimmed) {
      setInviteError("Podaj adres e-mail klienta.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setInviteError("Podaj poprawny adres e-mail.");
      return;
    }
    setInviteError(null);
    inviteMutation.mutate(trimmed);
  }

  const clients = (data ?? []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.headerSection, { paddingTop: topPad + 16, backgroundColor: colors.background }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>Klienci</Text>
            <View style={[styles.countBadge, { backgroundColor: colors.primary + "1a" }]}>
              <Text style={[styles.countText, { color: colors.primary }]}>{data?.length ?? 0}</Text>
            </View>
            <View style={{ flex: 1 }} />
            {(data?.length ?? 0) > 0 && (
              <Pressable
                onPress={() => {
                  if (!remindAllMutation.isPending) setRemindAllModalVisible(true);
                }}
                disabled={remindAllMutation.isPending}
                style={({ pressed }) => ({ opacity: (remindAllMutation.isPending || pressed) ? 0.6 : 1, marginRight: 14 })}
                testID="button-remind-all-clients"
              >
                {remindAllMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="notifications-outline" size={22} color={colors.primary} />
                )}
              </Pressable>
            )}
            <Pressable
              onPress={handleInviteOpen}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              testID="button-invite-client-header"
            >
              <Ionicons name="person-add-outline" size={22} color={colors.primary} />
            </Pressable>
          </View>
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Szukaj klientów..."
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
              testID="input-search-clients"
            />
            {search.length > 0 && (
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} onPress={() => setSearch("")} />
            )}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90 }]}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : clients.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="people-outline" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {search ? "Brak wyników" : "Brak klientów"}
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                {search
                  ? `Nie znaleziono klientów dla "${search}"`
                  : "Zaproś pierwszego klienta podając jego adres e-mail."}
              </Text>
              {!search && (
                <Pressable
                  onPress={handleInviteOpen}
                  style={({ pressed }) => [
                    styles.emptyInviteBtn,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                  ]}
                  testID="button-invite-first-client"
                >
                  <Ionicons name="person-add-outline" size={18} color="#fff" />
                  <Text style={styles.emptyInviteBtnText}>Zaproś klienta</Text>
                </Pressable>
              )}
            </View>
          ) : (
            clients.map((c) => (
              <ClientCard
                key={c.id}
                name={`${c.firstName} ${c.lastName}`}
                email={c.email}
                planName={c.assignment?.plan?.name ?? null}
                onPress={() => router.push(`/(trainer)/client/${c.id}`)}
              />
            ))
          )}
        </ScrollView>
      </View>

      <Modal
        visible={inviteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!inviteMutation.isPending) {
            setInviteModalVisible(false);
            setInviteEmail("");
            setInviteError(null);
          }
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalTitleRow}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Zaproś klienta</Text>
              <Pressable
                onPress={() => {
                  if (!inviteMutation.isPending) {
                    setInviteModalVisible(false);
                    setInviteEmail("");
                    setInviteError(null);
                  }
                }}
                testID="button-close-invite-modal"
              >
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <Text style={[styles.inviteHint, { color: colors.mutedForeground }]}>
              Podaj adres e-mail klienta. Otrzyma link i zostanie automatycznie przypisany do Ciebie.
            </Text>

            <TextInput
              style={[
                styles.inviteInput,
                {
                  backgroundColor: colors.background,
                  borderColor: inviteError ? "#e53935" : colors.border,
                  color: colors.foreground,
                },
              ]}
              placeholder="klient@example.com"
              placeholderTextColor={colors.mutedForeground}
              value={inviteEmail}
              onChangeText={(t) => { setInviteEmail(t); setInviteError(null); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              testID="input-invite-email"
            />

            {inviteError && (
              <Text style={styles.inviteErrorText}>{inviteError}</Text>
            )}

            <View style={styles.inviteModalBtns}>
              <Pressable
                onPress={() => {
                  if (!inviteMutation.isPending) {
                    setInviteModalVisible(false);
                    setInviteEmail("");
                    setInviteError(null);
                  }
                }}
                style={({ pressed }) => [
                  styles.inviteCancelBtn,
                  { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
                testID="button-cancel-invite"
              >
                <Text style={[styles.inviteCancelBtnText, { color: colors.foreground }]}>Anuluj</Text>
              </Pressable>
              <Pressable
                onPress={handleInviteSend}
                disabled={inviteMutation.isPending}
                style={({ pressed }) => [
                  styles.inviteSendBtn,
                  { backgroundColor: colors.primary, opacity: (inviteMutation.isPending || pressed) ? 0.7 : 1 },
                ]}
                testID="button-send-invite"
              >
                {inviteMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send-outline" size={16} color="#fff" />
                    <Text style={styles.inviteSendBtnText}>Wyślij</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={remindAllModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!remindAllMutation.isPending) {
            setRemindAllModalVisible(false);
            setBroadcastMessage("");
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalTitleRow}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Przypomnij wszystkim</Text>
              <Pressable
                onPress={() => {
                  if (!remindAllMutation.isPending) {
                    setRemindAllModalVisible(false);
                    setBroadcastMessage("");
                  }
                }}
                testID="button-close-remind-all-modal"
              >
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <Text style={[styles.remindModalHint, { color: colors.mutedForeground }]}>
              Opcjonalnie wpisz treść wiadomości. Jeśli pole będzie puste, zostanie użyta wiadomość domyślna. Powiadomienie trafi do wszystkich Twoich podopiecznych.
            </Text>

            <TextInput
              style={[
                styles.remindInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              placeholder="np. Pamiętaj o tygodniowym check-inie!"
              placeholderTextColor={colors.mutedForeground}
              value={broadcastMessage}
              onChangeText={setBroadcastMessage}
              multiline
              numberOfLines={3}
              maxLength={200}
              testID="input-remind-all-message"
            />

            <Pressable
              onPress={() => {
                if (!remindAllMutation.isPending) remindAllMutation.mutate(broadcastMessage);
              }}
              disabled={remindAllMutation.isPending}
              style={({ pressed }) => [
                styles.remindSendBtn,
                { backgroundColor: colors.primary, opacity: (remindAllMutation.isPending || pressed) ? 0.75 : 1 },
              ]}
              testID="button-confirm-remind-all"
            >
              {remindAllMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send-outline" size={16} color="#fff" />
              )}
              <Text style={styles.remindSendBtnText}>
                {remindAllMutation.isPending ? "Wysyłanie…" : "Wyślij do wszystkich"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerSection: { paddingHorizontal: 20, paddingBottom: 16 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  countBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  countText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  loader: { marginTop: 40 },
  emptyBox: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 20,
    maxHeight: "70%",
  },
  modalTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  remindModalHint: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 12, lineHeight: 18 },
  remindInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  remindSendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  remindSendBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptyInviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  emptyInviteBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  inviteHint: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 4 },
  inviteInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  inviteErrorText: { fontSize: 13, color: "#e53935", fontFamily: "Inter_400Regular", marginBottom: 4 },
  inviteModalBtns: { flexDirection: "row", gap: 12, marginTop: 8 },
  inviteCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  inviteCancelBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  inviteSendBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  inviteSendBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
