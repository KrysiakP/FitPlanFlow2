import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { StatsCard } from "@/components/StatsCard";
import { apiGet, apiPost } from "@/lib/api";
import { useState } from "react";

interface ClientPlan {
  id: string;
  name: string;
  description?: string | null;
}

interface ClientFromList {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string | null;
  assignment?: { plan?: ClientPlan | null } | null;
}

interface TrainingPlan {
  id: string;
  name: string;
  description?: string | null;
}

interface ProgressEntry {
  id: string;
  date: string;
  weight?: number | null;
  bodyFat?: number | null;
}

function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString("pl-PL"); } catch { return d; }
}

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { bearerToken } = useAuth();
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [assignModalVisible, setAssignModalVisible] = useState(false);

  const { data: progress, isLoading: loadingProgress, refetch, isRefetching } = useQuery<ProgressEntry[]>({
    queryKey: ["client-progress", id],
    queryFn: () => apiGet<ProgressEntry[]>(`/api/trainer/clients/${id}/progress`, bearerToken),
    enabled: !!id,
  });

  const { data: clientsList } = useQuery<ClientFromList[]>({
    queryKey: ["trainer-clients"],
    queryFn: () => apiGet<ClientFromList[]>("/api/trainer/clients", bearerToken),
    enabled: !!id,
  });
  const clientData = clientsList?.find((c) => c.id === id);
  const assignment = clientData?.assignment ?? null;

  const { data: plans } = useQuery<TrainingPlan[]>({
    queryKey: ["training-plans"],
    queryFn: () => apiGet<TrainingPlan[]>("/api/plans", bearerToken),
    enabled: assignModalVisible,
  });

  const assignMutation = useMutation({
    mutationFn: ({ planId }: { planId: string }) =>
      apiPost("/api/assignments/bulk", { planId, clientIds: [id] }, bearerToken),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["trainer-clients"] });
      setAssignModalVisible(false);
    },
  });

  const latestProgress = progress?.[0];

  return (
    <>
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 30 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="button-back">
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Klienci</Text>
        </Pressable>

        {clientData && (
          <Text style={[styles.clientName, { color: colors.foreground }]}>
            {clientData.firstName} {clientData.lastName}
          </Text>
        )}

        <View style={styles.planHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Aktywny plan</Text>
          <Pressable
            onPress={() => setAssignModalVisible(true)}
            style={({ pressed }) => [styles.assignBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
            testID="button-assign-plan"
          >
            <Ionicons name="swap-horizontal-outline" size={14} color="#fff" />
            <Text style={styles.assignBtnText}>{assignment?.plan ? "Zmień" : "Przypisz"}</Text>
          </Pressable>
        </View>

        {!clientsList ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <View style={[styles.planCard, { backgroundColor: colors.primary }]}>
            <Ionicons name="barbell-outline" size={20} color="rgba(255,255,255,0.8)" />
            <Text style={styles.planName}>
              {assignment?.plan?.name ?? "Brak przypisanego planu"}
            </Text>
            {assignment?.plan?.description && (
              <Text style={styles.planDesc}>{assignment.plan.description}</Text>
            )}
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ostatni pomiar</Text>
        {loadingProgress ? (
          <ActivityIndicator color={colors.primary} />
        ) : latestProgress ? (
          <>
            <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>{formatDate(latestProgress.date)}</Text>
            <View style={styles.statsRow}>
              {latestProgress.weight != null && (
                <StatsCard label="Waga (kg)" value={latestProgress.weight} iconName="scale-outline" color={colors.primary} />
              )}
              {latestProgress.bodyFat != null && (
                <StatsCard label="Tkanka (%)" value={latestProgress.bodyFat} iconName="body-outline" color="#d97706" />
              )}
            </View>
          </>
        ) : (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Brak pomiarów</Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Historia postępów</Text>
        {(progress ?? []).slice(0, 10).map((e) => (
          <View key={e.id} style={[styles.progressRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
            <Text style={[styles.progressDate, { color: colors.foreground }]}>{formatDate(e.date)}</Text>
            {e.weight != null && <Text style={[styles.progressValue, { color: colors.mutedForeground }]}>{e.weight} kg</Text>}
            {e.bodyFat != null && <Text style={[styles.progressValue, { color: colors.mutedForeground }]}>{e.bodyFat}% TT</Text>}
          </View>
        ))}
        {(progress ?? []).length === 0 && !loadingProgress && (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Brak historii pomiarów</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={assignModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalTitleRow}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Wybierz plan</Text>
              <Pressable onPress={() => setAssignModalVisible(false)} testID="button-close-assign-modal">
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {!plans ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
            ) : plans.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.mutedForeground, textAlign: "center", marginVertical: 24 }]}>
                Brak planów. Utwórz plan na paneltrenera.pl.
              </Text>
            ) : (
              <ScrollView style={styles.planList} showsVerticalScrollIndicator={false}>
                {plans.map((plan) => {
                  const isCurrent = plan.id === assignment?.plan?.id;
                  return (
                    <Pressable
                      key={plan.id}
                      onPress={() => { if (!assignMutation.isPending) assignMutation.mutate({ planId: plan.id }); }}
                      style={({ pressed }) => [
                        styles.planRow,
                        {
                          backgroundColor: isCurrent ? colors.primary + "18" : colors.background,
                          borderColor: isCurrent ? colors.primary : colors.border,
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                      testID={`button-plan-${plan.id}`}
                    >
                      <View style={styles.planRowLeft}>
                        <Text style={[styles.planRowName, { color: colors.foreground }]}>{plan.name}</Text>
                        {plan.description && (
                          <Text style={[styles.planRowDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
                            {plan.description}
                          </Text>
                        )}
                      </View>
                      {isCurrent && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                      {assignMutation.isPending && assignMutation.variables?.planId === plan.id && (
                        <ActivityIndicator size="small" color={colors.primary} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {assignMutation.isError && (
              <Text style={styles.errorText}>
                {(assignMutation.error as Error)?.message ?? "Błąd przypisywania planu"}
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 16 },
  backText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  clientName: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 20 },
  planHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  assignBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  assignBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  planCard: { borderRadius: 16, padding: 18, marginBottom: 20, gap: 8 },
  planName: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  planDesc: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontFamily: "Inter_400Regular" },
  dateLabel: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 10, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  emptyBox: { borderRadius: 12, borderWidth: 1, padding: 20, alignItems: "center", marginBottom: 16 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 8 },
  progressDate: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  progressValue: { fontSize: 13, fontFamily: "Inter_400Regular" },
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
  planList: { maxHeight: 400 },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  planRowLeft: { flex: 1, gap: 4 },
  planRowName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  planRowDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  errorText: { fontSize: 13, color: "#e53935", fontFamily: "Inter_400Regular", marginTop: 8 },
});
