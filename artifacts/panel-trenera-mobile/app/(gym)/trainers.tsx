import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

type GymTrainerRow = {
  id: string;
  status: "invited" | "active" | "suspended";
  inviteEmail: string;
  inviteCode: string | null;
  invitedAt: string;
  joinedAt: string | null;
  trainerId: string | null;
  trainerEmail: string | null;
  trainerFirstName: string | null;
  trainerLastName: string | null;
  trainerProfileImageUrl: string | null;
  trainerClientCount: number;
  sessionsLast30Days: number;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Aktywny", color: "#10b981" },
  invited: { label: "Zaproszony", color: "#f59e0b" },
  suspended: { label: "Zawieszony", color: "#ef4444" },
};

export default function GymTrainers() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  const { data: trainers = [], isLoading, refetch, isRefetching } = useQuery<GymTrainerRow[]>({
    queryKey: ["gym-trainers"],
    queryFn: () => apiGet("/api/gym/trainers"),
  });

  const inviteMutation = useMutation({
    mutationFn: (email: string) => apiPost("/api/gym/trainers/invite", { email }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gym-trainers"] });
      qc.invalidateQueries({ queryKey: ["gym-me"] });
      setModalVisible(false);
      setInviteEmail("");
    },
    onError: (e: any) => Alert.alert("Błąd", e?.message ?? "Nie udało się zaprosić trenera"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiPatch(`/api/gym/trainers/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym-trainers"] }),
    onError: (e: any) => Alert.alert("Błąd", e?.message ?? "Nie udało się zmienić statusu"),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/gym/trainers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gym-trainers"] });
      qc.invalidateQueries({ queryKey: ["gym-me"] });
    },
    onError: (e: any) => Alert.alert("Błąd", e?.message ?? "Nie udało się usunąć trenera"),
  });

  function handleStatusChange(row: GymTrainerRow) {
    if (row.status === "invited") return;
    const next = row.status === "active" ? "suspended" : "active";
    const label = next === "suspended" ? "Zawiesić" : "Aktywować";
    Alert.alert(
      `${label} trenera?`,
      `${row.trainerFirstName ?? row.inviteEmail} zostanie ${next === "suspended" ? "zawieszony" : "aktywowany"}.`,
      [
        { text: "Anuluj", style: "cancel" },
        { text: label, style: next === "suspended" ? "destructive" : "default", onPress: () => statusMutation.mutate({ id: row.id, status: next }) },
      ]
    );
  }

  function handleRemove(row: GymTrainerRow) {
    Alert.alert(
      "Usuń trenera?",
      `Czy na pewno chcesz usunąć ${row.trainerFirstName ?? row.inviteEmail} z siłowni?`,
      [
        { text: "Anuluj", style: "cancel" },
        { text: "Usuń", style: "destructive", onPress: () => removeMutation.mutate(row.id) },
      ]
    );
  }

  const active = trainers.filter((t) => t.status === "active");
  const invited = trainers.filter((t) => t.status === "invited");
  const suspended = trainers.filter((t) => t.status === "suspended");

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => setModalVisible(true)}
          style={({ pressed }) => [styles.inviteBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          testID="button-invite-trainer"
        >
          <Ionicons name="person-add-outline" size={18} color="#fff" />
          <Text style={styles.inviteBtnText}>Zaproś trenera</Text>
        </Pressable>

        {trainers.length === 0 ? (
          <View style={[styles.emptyState, { borderColor: colors.border }]}>
            <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Brak trenerów</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Zaproś pierwszego trenera, aby dodać go do siłowni.
            </Text>
          </View>
        ) : (
          <>
            {active.length > 0 && (
              <SectionBlock title="Aktywni trenerzy" count={active.length} colors={colors}>
                {active.map((t) => (
                  <TrainerCard
                    key={t.id}
                    row={t}
                    colors={colors}
                    onPress={() => router.push({ pathname: "/(gym)/trainer/[id]", params: { id: t.trainerId! } })}
                    onStatusChange={() => handleStatusChange(t)}
                    onRemove={() => handleRemove(t)}
                  />
                ))}
              </SectionBlock>
            )}
            {invited.length > 0 && (
              <SectionBlock title="Oczekujące zaproszenia" count={invited.length} colors={colors}>
                {invited.map((t) => (
                  <TrainerCard
                    key={t.id}
                    row={t}
                    colors={colors}
                    onPress={undefined}
                    onStatusChange={undefined}
                    onRemove={() => handleRemove(t)}
                  />
                ))}
              </SectionBlock>
            )}
            {suspended.length > 0 && (
              <SectionBlock title="Zawieszeni trenerzy" count={suspended.length} colors={colors}>
                {suspended.map((t) => (
                  <TrainerCard
                    key={t.id}
                    row={t}
                    colors={colors}
                    onPress={() => router.push({ pathname: "/(gym)/trainer/[id]", params: { id: t.trainerId! } })}
                    onStatusChange={() => handleStatusChange(t)}
                    onRemove={() => handleRemove(t)}
                  />
                ))}
              </SectionBlock>
            )}
          </>
        )}
      </ScrollView>

      {/* Invite modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Zaproś trenera</Text>
              <Pressable onPress={() => setModalVisible(false)} testID="button-close-invite-modal">
                <Ionicons name="close" size={24} color={colors.foreground} />
              </Pressable>
            </View>
            <Text style={[styles.modalDesc, { color: colors.mutedForeground }]}>
              Wpisz adres e-mail trenera. Jeśli ma już konto, zostanie od razu dodany jako aktywny.
            </Text>
            <TextInput
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="adres@email.pl"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.emailInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              testID="input-invite-email"
            />
            <Pressable
              onPress={() => inviteMutation.mutate(inviteEmail.trim())}
              disabled={inviteMutation.isPending || !inviteEmail.trim()}
              style={({ pressed }) => [
                styles.modalBtn,
                { backgroundColor: colors.primary, opacity: pressed || inviteMutation.isPending || !inviteEmail.trim() ? 0.7 : 1 },
              ]}
              testID="button-send-invite"
            >
              {inviteMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.modalBtnText}>Wyślij zaproszenie</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function SectionBlock({ title, count, children, colors }: { title: string; count: number; children: React.ReactNode; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
        <View style={[styles.countBadge, { backgroundColor: colors.primary + "18" }]}>
          <Text style={[styles.countBadgeText, { color: colors.primary }]}>{count}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

function TrainerCard({
  row,
  colors,
  onPress,
  onStatusChange,
  onRemove,
}: {
  row: GymTrainerRow;
  colors: ReturnType<typeof useColors>;
  onPress?: () => void;
  onStatusChange?: () => void;
  onRemove: () => void;
}) {
  const st = STATUS_LABELS[row.status] ?? STATUS_LABELS.invited;
  const name = row.trainerFirstName
    ? `${row.trainerFirstName} ${row.trainerLastName}`
    : row.inviteEmail;
  const initials = row.trainerFirstName
    ? ((row.trainerFirstName[0] ?? "") + (row.trainerLastName?.[0] ?? "")).toUpperCase()
    : row.inviteEmail[0].toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.trainerCard,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
      testID={`card-trainer-${row.id}`}
    >
      <View style={[styles.trainerAvatar, { backgroundColor: colors.primary + "18" }]}>
        <Text style={[styles.trainerAvatarText, { color: colors.primary }]}>{initials}</Text>
      </View>
      <View style={styles.trainerInfo}>
        <View style={styles.trainerNameRow}>
          <Text style={[styles.trainerName, { color: colors.foreground }]} numberOfLines={1}>{name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: st.color + "18" }]}>
            <Text style={[styles.statusBadgeText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>
        <Text style={[styles.trainerEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
          {row.trainerEmail ?? row.inviteEmail}
        </Text>
        {row.status === "active" && (
          <View style={styles.trainerStats}>
            <View style={styles.trainerStat}>
              <Ionicons name="people-outline" size={13} color={colors.mutedForeground} />
              <Text style={[styles.trainerStatText, { color: colors.mutedForeground }]}>{row.trainerClientCount} klientów</Text>
            </View>
            <View style={styles.trainerStat}>
              <Ionicons name="barbell-outline" size={13} color={colors.mutedForeground} />
              <Text style={[styles.trainerStatText, { color: colors.mutedForeground }]}>{row.sessionsLast30Days} sesji / 30 dni</Text>
            </View>
          </View>
        )}
        {row.status === "invited" && row.inviteCode && (
          <Text style={[styles.trainerEmail, { color: colors.mutedForeground }]}>
            Kod: {row.inviteCode}
          </Text>
        )}
      </View>
      <View style={styles.trainerActions}>
        {onStatusChange && (
          <Pressable
            onPress={onStatusChange}
            style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
            testID={`button-toggle-status-${row.id}`}
          >
            <Ionicons
              name={row.status === "active" ? "pause-circle-outline" : "play-circle-outline"}
              size={22}
              color={row.status === "active" ? "#f59e0b" : "#10b981"}
            />
          </Pressable>
        )}
        <Pressable
          onPress={onRemove}
          style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
          testID={`button-remove-trainer-${row.id}`}
        >
          <Ionicons name="trash-outline" size={22} color={colors.destructive} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16 },
  inviteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 14, marginBottom: 20 },
  inviteBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptyState: { alignItems: "center", gap: 10, paddingVertical: 48, borderWidth: 1, borderRadius: 16, borderStyle: "dashed", paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  sectionBlock: { marginBottom: 20 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  countBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  trainerCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8, gap: 12 },
  trainerAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  trainerAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  trainerInfo: { flex: 1, gap: 4 },
  trainerNameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  trainerName: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  statusBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  trainerEmail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  trainerStats: { flexDirection: "row", gap: 12 },
  trainerStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  trainerStatText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  trainerActions: { flexDirection: "row", gap: 4 },
  actionBtn: { padding: 6 },
  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, gap: 16 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  emailInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  modalBtn: { padding: 14, borderRadius: 12, alignItems: "center" },
  modalBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
