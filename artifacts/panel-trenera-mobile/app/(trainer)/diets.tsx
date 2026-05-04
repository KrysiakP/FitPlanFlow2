import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { DrawerMenuButton } from "@/components/DrawerMenuButton";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
}

interface DietPlan {
  id: string;
  name: string;
  status: "draft" | "active" | "completed";
  clientId: string | null;
  targetCalories: number;
  targetProtein: number;
  targetFat: number;
  targetCarbs: number;
  mode: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Szkic",
  active: "Aktywny",
  completed: "Ukończony",
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: "#f59e0b1a", text: "#d97706" },
  active: { bg: "#22c55e1a", text: "#16a34a" },
  completed: { bg: "#6b72801a", text: "#6b7280" },
};

export default function TrainerDietsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = insets.top;

  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<DietPlan | null>(null);

  const { data: plans = [], isLoading, refetch, isRefetching } = useQuery<DietPlan[]>({
    queryKey: ["trainer-diet-plans"],
    queryFn: () => apiGet<DietPlan[]>("/api/diets/plans"),
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["trainer-clients-simple"],
    queryFn: () => apiGet<Client[]>("/api/trainer/clients"),
  });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; clientId?: string | null }) =>
      apiPost<{ id: string }>("/api/diets/plans", {
        name: body.name,
        clientId: body.clientId || null,
        targetCalories: 2000,
        targetProtein: 150,
        targetFat: 56,
        targetCarbs: 225,
        mealsPerDay: 3,
        mode: "full_plan",
        status: "draft",
      }),
    onSuccess: (data: { id: string }) => {
      void queryClient.invalidateQueries({ queryKey: ["trainer-diet-plans"] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowNewModal(false);
      setNewName("");
      setSelectedClientId(null);
      setClientSearch("");
      router.push(`/(trainer)/diet/${data.id}`);
    },
    onError: () => {
      Alert.alert("Błąd", "Nie udało się utworzyć planu. Spróbuj ponownie.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/diets/plans/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["trainer-diet-plans"] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPlanToDelete(null);
    },
    onError: () => {
      setPlanToDelete(null);
    },
  });

  function handleCreate() {
    if (!newName.trim()) {
      Alert.alert("Błąd", "Podaj nazwę planu.");
      return;
    }
    const safeClientId = selectedClientId?.startsWith("demo-") ? null : selectedClientId;
    createMutation.mutate({ name: newName.trim(), clientId: safeClientId });
  }

  function openNewModal() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNewName("");
    setSelectedClientId(null);
    setClientSearch("");
    setShowNewModal(true);
  }

  const realClients = clients.filter((c) => !c.id.startsWith("demo-"));

  const filteredClients = clientSearch
    ? realClients.filter((c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(clientSearch.toLowerCase())
      )
    : realClients;

  const selectedClient = realClients.find((c) => c.id === selectedClientId);

  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.stickyHeader, { paddingTop: topPad + 8, backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <DrawerMenuButton />
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Plany diety</Text>
          <View style={[styles.countBadge, { backgroundColor: colors.primary + "1a" }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>{plans.length}</Text>
          </View>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: 8, paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : plans.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="nutrition-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Brak planów diety</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Utwórz pierwszy plan dietetyczny dla swoich podopiecznych.
            </Text>
          </View>
        ) : (
          plans.map((plan) => {
            const sc = STATUS_COLORS[plan.status] ?? STATUS_COLORS.draft;
            const client = plan.clientId ? clientMap[plan.clientId] : null;
            return (
              <Pressable
                key={plan.id}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/(trainer)/diet/${plan.id}`);
                }}
                style={({ pressed }) => [
                  styles.planCard,
                  { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                ]}
                testID={`card-diet-plan-${plan.id}`}
              >
                <View style={styles.planCardTop}>
                  <View style={[styles.planIcon, { backgroundColor: colors.primary + "1a" }]}>
                    <Ionicons name="nutrition-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.planInfo}>
                    <Text style={[styles.planName, { color: colors.foreground }]} testID={`text-plan-name-${plan.id}`}>
                      {plan.name}
                    </Text>
                    {client && (
                      <View style={styles.clientRow}>
                        <Ionicons name="person-outline" size={12} color={colors.mutedForeground} />
                        <Text style={[styles.clientName, { color: colors.mutedForeground }]}>
                          {client.firstName} {client.lastName}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>{STATUS_LABELS[plan.status] ?? plan.status}</Text>
                  </View>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setPlanToDelete(plan);
                    }}
                    style={[styles.deleteBtn, { backgroundColor: "#ef44441a" }]}
                    testID={`button-delete-plan-${plan.id}`}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </Pressable>
                </View>
                <View style={[styles.macroRow, { borderTopColor: colors.border }]}>
                  <MacroItem label="Kcal" value={String(plan.targetCalories)} color={colors.primary} />
                  <MacroItem label="Białko" value={`${plan.targetProtein}g`} color="#16a34a" />
                  <MacroItem label="Tłuszcz" value={`${plan.targetFat}g`} color="#7c3aed" />
                  <MacroItem label="Węgle" value={`${plan.targetCarbs}g`} color="#d97706" />
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={openNewModal}
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 24 }]}
        testID="button-new-diet-plan"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      {/* New plan modal */}
      <Modal visible={showNewModal} transparent animationType="slide" onRequestClose={() => setShowNewModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowNewModal(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Nowy plan diety</Text>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Nazwa planu *</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="np. Plan redukcyjny"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              autoFocus
              testID="input-diet-plan-name"
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Klient (opcjonalnie)</Text>
            <Pressable
              onPress={() => setShowClientPicker(true)}
              style={[styles.clientPickerBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
              testID="button-select-client"
            >
              <Ionicons name="person-outline" size={16} color={colors.mutedForeground} />
              <Text style={[styles.clientPickerText, { color: selectedClient ? colors.foreground : colors.mutedForeground }]}>
                {selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : "Wybierz klienta"}
              </Text>
              {selectedClient && (
                <Pressable
                  onPress={(e) => { e.stopPropagation(); setSelectedClientId(null); }}
                  testID="button-clear-client"
                >
                  <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
                </Pressable>
              )}
            </Pressable>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowNewModal(false)}
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                testID="button-cancel-new-plan"
              >
                <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Anuluj</Text>
              </Pressable>
              <Pressable
                onPress={handleCreate}
                disabled={createMutation.isPending}
                style={[styles.createBtn, { backgroundColor: colors.primary, opacity: createMutation.isPending ? 0.7 : 1 }]}
                testID="button-create-diet-plan"
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.createBtnText}>Utwórz plan</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal visible={!!planToDelete} transparent animationType="fade" onRequestClose={() => setPlanToDelete(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPlanToDelete(null)}>
          <Pressable style={[styles.confirmSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <View style={[styles.confirmIconWrap, { backgroundColor: "#ef44441a" }]}>
              <Ionicons name="trash-outline" size={28} color="#ef4444" />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>Usuń plan diety</Text>
            <Text style={[styles.confirmDesc, { color: colors.mutedForeground }]}>
              Czy na pewno chcesz usunąć plan{"\n"}
              <Text style={{ fontFamily: "Inter_700Bold", color: colors.foreground }}>
                {planToDelete?.name}
              </Text>
              ?{"\n"}Tej operacji nie można cofnąć.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setPlanToDelete(null)}
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                testID="button-cancel-delete"
              >
                <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Anuluj</Text>
              </Pressable>
              <Pressable
                onPress={() => planToDelete && deleteMutation.mutate(planToDelete.id)}
                disabled={deleteMutation.isPending}
                style={[styles.deleteConfirmBtn, { opacity: deleteMutation.isPending ? 0.7 : 1 }]}
                testID="button-confirm-delete"
              >
                {deleteMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.deleteConfirmBtnText}>Usuń</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Client picker modal */}
      <Modal visible={showClientPicker} transparent animationType="slide" onRequestClose={() => setShowClientPicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowClientPicker(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Wybierz klienta</Text>
            <TextInput
              value={clientSearch}
              onChangeText={setClientSearch}
              placeholder="Szukaj..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              testID="input-client-search"
            />
            <ScrollView style={styles.clientList} showsVerticalScrollIndicator={false}>
              <Pressable
                onPress={() => { setSelectedClientId(null); setShowClientPicker(false); }}
                style={[styles.clientItem, { borderBottomColor: colors.border }]}
                testID="option-client-none"
              >
                <Text style={[styles.clientItemText, { color: colors.mutedForeground }]}>Bez klienta</Text>
              </Pressable>
              {filteredClients.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => { setSelectedClientId(c.id); setShowClientPicker(false); }}
                  style={[
                    styles.clientItem,
                    { borderBottomColor: colors.border, backgroundColor: selectedClientId === c.id ? colors.primary + "10" : "transparent" },
                  ]}
                  testID={`option-client-${c.id}`}
                >
                  <Text style={[styles.clientItemText, { color: colors.foreground }]}>
                    {c.firstName} {c.lastName}
                  </Text>
                  {selectedClientId === c.id && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function MacroItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={macroStyles.wrap}>
      <Text style={[macroStyles.label, { color: color + "99" }]}>{label}</Text>
      <Text style={[macroStyles.value, { color }]}>{value}</Text>
    </View>
  );
}

const macroStyles = StyleSheet.create({
  wrap: { alignItems: "center", flex: 1 },
  label: { fontSize: 10, fontFamily: "Inter_500Medium" },
  value: { fontSize: 14, fontFamily: "Inter_700Bold" },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  stickyHeader: { paddingHorizontal: 20, paddingBottom: 8 },
  content: { paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  countBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2 },
  countText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  loader: { marginTop: 40 },
  emptyBox: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 12, marginTop: 20 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  planCard: { borderRadius: 14, borderWidth: 1, marginBottom: 12, overflow: "hidden" },
  planCardTop: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  planIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  planInfo: { flex: 1, gap: 3 },
  planName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  clientRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  clientName: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  macroRow: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, gap: 4 },
  fab: { position: "absolute", right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, gap: 12 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 4 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular" },
  clientPickerBtn: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  clientPickerText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  createBtn: { flex: 2, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  createBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  clientList: { maxHeight: 300 },
  clientItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1 },
  clientItemText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  deleteBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center", marginLeft: 6 },
  confirmSheet: { borderRadius: 20, margin: 24, padding: 24, alignItems: "center", gap: 12 },
  confirmIconWrap: { width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  confirmTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  confirmDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  deleteConfirmBtn: { flex: 2, borderRadius: 10, paddingVertical: 12, alignItems: "center", backgroundColor: "#ef4444" },
  deleteConfirmBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
