import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
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
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost } from "@/lib/api";

interface Invitation {
  id: string;
  clientEmail: string;
  status: string;
  createdAt: string;
  expiresAt?: string | null;
  token?: string | null;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "–";
  try {
    return new Date(dateStr).toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Oczekujące",
  accepted: "Zaakceptowane",
  expired: "Wygasłe",
  cancelled: "Anulowane",
};

export default function TrainerInvitationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, bearerToken } = useAuth();
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [modalVisible, setModalVisible] = useState(false);
  const [email, setEmail] = useState("");

  const { data, isLoading, refetch, isRefetching } = useQuery<Invitation[]>({
    queryKey: ["invitations"],
    queryFn: () => apiGet<Invitation[]>("/api/invitations", bearerToken),
    enabled: !!user?.id,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: (clientEmail: string) =>
      apiPost<Invitation>("/api/invitations/send", { clientEmail }, bearerToken),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitations"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalVisible(false);
      setEmail("");
    },
  });

  const invitations = data ?? [];
  const pending = invitations.filter((i) => i.status === "pending");
  const others = invitations.filter((i) => i.status !== "pending");

  async function handleShare(invitation: Invitation) {
    const link = `https://paneltrenera.pl/zaproszenie/${invitation.token ?? invitation.id}`;
    await Share.share({
      message: `Dołącz do Panelu Trenera jako mój podopieczny: ${link}`,
      url: link,
    });
  }

  function handleCreate() {
    const trimmed = email.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed);
  }

  return (
    <>
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: 16, paddingBottom: insets.bottom + 30 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.infoCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            Zaproś klientów podając ich e-mail. Klient otrzyma link i automatycznie zostanie przypisany do Ciebie.
          </Text>
        </View>

        <Pressable
          onPress={() => setModalVisible(true)}
          style={({ pressed }) => [
            styles.createBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          testID="button-create-invitation"
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.createBtnText}>Wyślij zaproszenie</Text>
        </Pressable>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <>
            {pending.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Aktywne ({pending.length})
                </Text>
                {pending.map((inv) => (
                  <InvitationCard
                    key={inv.id}
                    invitation={inv}
                    colors={colors}
                    onShare={() => handleShare(inv)}
                  />
                ))}
              </>
            )}

            {others.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Historia</Text>
                {others.map((inv) => (
                  <InvitationCard
                    key={inv.id}
                    invitation={inv}
                    colors={colors}
                    onShare={() => handleShare(inv)}
                  />
                ))}
              </>
            )}

            {invitations.length === 0 && (
              <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="mail-outline" size={36} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Brak zaproszeń</Text>
                <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                  Wyślij zaproszenie do klienta, podając jego adres e-mail.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Nowe zaproszenie</Text>
            <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>
              Adres e-mail klienta
            </Text>
            <TextInput
              style={[styles.emailInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
              value={email}
              onChangeText={setEmail}
              placeholder="klient@example.com"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              testID="input-invitation-email"
            />
            {createMutation.isError && (
              <Text style={styles.errorText}>
                {(createMutation.error as Error)?.message ?? "Błąd wysyłania zaproszenia"}
              </Text>
            )}
            <View style={styles.modalBtns}>
              <Pressable
                onPress={() => { setModalVisible(false); setEmail(""); }}
                style={({ pressed }) => [styles.cancelBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                testID="button-cancel-invitation"
              >
                <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>Anuluj</Text>
              </Pressable>
              <Pressable
                onPress={handleCreate}
                disabled={!email.trim() || createMutation.isPending}
                style={({ pressed }) => [
                  styles.sendBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: (!email.trim() || createMutation.isPending || pressed) ? 0.65 : 1,
                  },
                ]}
                testID="button-send-invitation"
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.sendBtnText}>Wyślij</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

type Colors = ReturnType<typeof useColors>;

interface InvitationCardProps {
  invitation: Invitation;
  colors: Colors;
  onShare: () => void;
}

function InvitationCard({ invitation, colors, onShare }: InvitationCardProps) {
  const statusColor: Record<string, string> = {
    pending: "#16a34a",
    accepted: "#0846ab",
    expired: "#9e9e9e",
    cancelled: "#e53935",
  };
  const color = statusColor[invitation.status] ?? colors.mutedForeground;

  return (
    <View style={[styles.invCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.invHeader}>
        <View style={[styles.invIcon, { backgroundColor: color + "18" }]}>
          <Ionicons name="mail-outline" size={18} color={color} />
        </View>
        <View style={styles.invInfo}>
          <Text style={[styles.invEmail, { color: colors.foreground }]}>
            {invitation.clientEmail || "Zaproszenie ogólne"}
          </Text>
          <View style={styles.invMeta}>
            <View style={[styles.statusBadge, { backgroundColor: color + "18" }]}>
              <Text style={[styles.statusText, { color }]}>
                {STATUS_LABELS[invitation.status] ?? invitation.status}
              </Text>
            </View>
            {invitation.expiresAt && (
              <Text style={[styles.invDate, { color: colors.mutedForeground }]}>
                Wygasa: {formatDate(invitation.expiresAt)}
              </Text>
            )}
          </View>
        </View>
        {invitation.status === "pending" && (
          <Pressable onPress={onShare} style={styles.shareBtn} testID="button-share-invitation">
            <Ionicons name="share-outline" size={20} color={colors.primary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 14,
    marginBottom: 24,
  },
  createBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  loader: { marginTop: 40 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 10 },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  invCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  invHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  invIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  invInfo: { flex: 1, gap: 6 },
  invEmail: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  invMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  invDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  shareBtn: { padding: 6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalBox: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 14,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: -6 },
  emailInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  errorText: { fontSize: 13, color: "#e53935", fontFamily: "Inter_400Regular" },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sendBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
