import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

interface TrainingPlan {
  id: string;
  name: string;
  description?: string | null;
  workouts?: { id: string; name: string }[];
}

export default function TrainerPlansScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanDesc, setNewPlanDesc] = useState("");

  const { data, isLoading, refetch, isRefetching } = useQuery<TrainingPlan[]>({
    queryKey: ["training-plans"],
    queryFn: () => apiGet<TrainingPlan[]>("/api/plans"),
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; description?: string }) =>
      apiPost<TrainingPlan>("/api/plans", body),
    onSuccess: (plan) => {
      qc.invalidateQueries({ queryKey: ["training-plans"] });
      setCreateModalVisible(false);
      setNewPlanName("");
      setNewPlanDesc("");
      router.push(`/(trainer)/plan/${plan.id}`);
    },
    onError: () => {
      Alert.alert("Błąd", "Nie udało się utworzyć planu.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/plans/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training-plans"] });
    },
    onError: () => {
      Alert.alert("Błąd", "Nie udało się usunąć planu.");
    },
  });

  function handleCreate() {
    const name = newPlanName.trim();
    if (!name) {
      Alert.alert("Błąd", "Nazwa planu jest wymagana.");
      return;
    }
    createMutation.mutate({ name, description: newPlanDesc.trim() || undefined });
  }

  function confirmDelete(plan: TrainingPlan) {
    Alert.alert(
      "Usuń plan",
      `Czy na pewno chcesz usunąć plan "${plan.name}"? Tej operacji nie można cofnąć.`,
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń",
          style: "destructive",
          onPress: async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            deleteMutation.mutate(plan.id);
          },
        },
      ]
    );
  }

  const plans = data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 90 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Plany treningowe</Text>
          <View style={[styles.countBadge, { backgroundColor: colors.primary + "1a" }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>{plans.length}</Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : plans.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="clipboard-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Brak planów</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Naciśnij „+" aby utworzyć pierwszy plan treningowy
            </Text>
          </View>
        ) : (
          plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              activeOpacity={0.75}
              testID={`card-plan-${plan.id}`}
              onPress={() => router.push(`/(trainer)/plan/${plan.id}`)}
              style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.planHeader}>
                <View style={[styles.planIcon, { backgroundColor: colors.primary + "1a" }]}>
                  <Ionicons name="barbell-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.planInfo}>
                  <Text style={[styles.planName, { color: colors.foreground }]}>{plan.name}</Text>
                  {plan.description ? (
                    <Text style={[styles.planDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                      {plan.description}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    confirmDelete(plan);
                  }}
                  style={styles.deleteBtn}
                  testID={`button-delete-plan-${plan.id}`}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                </TouchableOpacity>
              </View>
              {plan.workouts && plan.workouts.length > 0 && (
                <View style={styles.workoutsList}>
                  {plan.workouts.map((w, i) => (
                    <View key={w.id} style={[styles.workoutChip, { backgroundColor: colors.accent }]}>
                      <Text style={[styles.workoutChipText, { color: colors.mutedForeground }]}>
                        {i + 1}. {w.name}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={[styles.planFooter, { borderTopColor: colors.border }]}>
                <Ionicons name="layers-outline" size={14} color={colors.mutedForeground} />
                <Text style={[styles.planFooterText, { color: colors.mutedForeground }]}>
                  {plan.workouts?.length ?? 0} treningów
                </Text>
                <View style={{ flex: 1 }} />
                <Ionicons name="chevron-forward-outline" size={14} color={colors.mutedForeground} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 24 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setCreateModalVisible(true);
        }}
        testID="button-new-plan"
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setCreateModalVisible(false)}
        />
        <View style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 24 }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Nowy plan treningowy</Text>

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Nazwa planu *</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            placeholder="np. Plan siłowy 3x w tygodniu"
            placeholderTextColor={colors.mutedForeground}
            value={newPlanName}
            onChangeText={setNewPlanName}
            autoFocus
            testID="input-new-plan-name"
          />

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Opis (opcjonalnie)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            placeholder="Opisz cel i zakres planu"
            placeholderTextColor={colors.mutedForeground}
            value={newPlanDesc}
            onChangeText={setNewPlanDesc}
            multiline
            numberOfLines={3}
            testID="input-new-plan-desc"
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.btnSecondary, { borderColor: colors.border }]}
              onPress={() => {
                setCreateModalVisible(false);
                setNewPlanName("");
                setNewPlanDesc("");
              }}
              testID="button-cancel-create-plan"
            >
              <Text style={[styles.btnSecondaryText, { color: colors.foreground }]}>Anuluj</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: colors.primary, opacity: createMutation.isPending ? 0.7 : 1 }]}
              onPress={handleCreate}
              disabled={createMutation.isPending}
              testID="button-confirm-create-plan"
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnPrimaryText}>Utwórz plan</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  countBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  countText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  loader: { marginTop: 40 },
  emptyBox: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  planCard: { borderRadius: 14, borderWidth: 1, marginBottom: 12, overflow: "hidden" },
  planHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16 },
  planIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  planInfo: { flex: 1 },
  planName: { fontSize: 16, fontFamily: "Inter_600SemiBold", lineHeight: 22 },
  planDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: 2 },
  deleteBtn: { padding: 4, justifyContent: "center", alignItems: "center" },
  workoutsList: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 16, paddingBottom: 12 },
  workoutChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  workoutChipText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  planFooter: { flexDirection: "row", alignItems: "center", gap: 6, borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 10 },
  planFooterText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  fab: { position: "absolute", right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingTop: 12, gap: 12 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 4 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 4 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular" },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  btnSecondary: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  btnSecondaryText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  btnPrimary: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
