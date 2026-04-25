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
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

interface ClientPayment {
  id: string;
  clientId: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  notes?: string | null;
  isRecurring?: boolean;
  paidAt?: string | null;
}

interface TrainerClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

type Colors = ReturnType<typeof useColors>;

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

function formatAmount(amountInCents: number) {
  return `${(amountInCents / 100).toFixed(2).replace(".", ",")} zł`;
}

function isOverdue(payment: ClientPayment) {
  return !payment.isPaid && new Date(payment.dueDate) < new Date();
}

function toDateInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface PaymentCardProps {
  payment: ClientPayment;
  clientName: string;
  colors: Colors;
  onMarkPaid: () => void;
  onDelete: () => void;
  markingPaid: boolean;
  deleting: boolean;
}

function PaymentCard({ payment, clientName, colors, onMarkPaid, onDelete, markingPaid, deleting }: PaymentCardProps) {
  const overdue = isOverdue(payment);
  const borderColor = overdue ? "#ef444440" : colors.border;
  const bgColor = overdue ? "#ef44440a" : colors.card;

  return (
    <View style={[styles.card, { backgroundColor: bgColor, borderColor }]} testID={`card-payment-${payment.id}`}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={[styles.clientName, { color: colors.foreground }]} testID={`text-client-${payment.id}`}>
            {clientName}
          </Text>
          <Text style={[styles.amount, { color: overdue ? "#ef4444" : colors.foreground }]} testID={`text-amount-${payment.id}`}>
            {formatAmount(payment.amount)}
          </Text>
        </View>
        <View style={styles.badgeCol}>
          {payment.isPaid ? (
            <View style={[styles.badge, { backgroundColor: "#16a34a18" }]}>
              <Text style={[styles.badgeText, { color: "#16a34a" }]}>Opłacono</Text>
            </View>
          ) : overdue ? (
            <View style={[styles.badge, { backgroundColor: "#ef444418" }]}>
              <Text style={[styles.badgeText, { color: "#ef4444" }]}>Zaległość</Text>
            </View>
          ) : (
            <View style={[styles.badge, { backgroundColor: colors.primary + "18" }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>Oczekuje</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.cardMeta}>
        <Ionicons name="calendar-outline" size={14} color={overdue ? "#ef4444" : colors.mutedForeground} />
        <Text style={[styles.metaText, { color: overdue ? "#ef4444" : colors.mutedForeground }]} testID={`text-date-${payment.id}`}>
          Termin: {formatDate(payment.dueDate)}
        </Text>
      </View>

      {payment.notes ? (
        <Text style={[styles.notes, { color: colors.mutedForeground }]} testID={`text-notes-${payment.id}`}>
          {payment.notes}
        </Text>
      ) : null}

      <View style={styles.cardActions}>
        {!payment.isPaid && (
          <Pressable
            onPress={onMarkPaid}
            disabled={markingPaid}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: "#16a34a18", flex: 1, opacity: markingPaid || pressed ? 0.6 : 1 },
            ]}
            testID={`button-mark-paid-${payment.id}`}
          >
            {markingPaid ? (
              <ActivityIndicator size="small" color="#16a34a" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                <Text style={[styles.actionBtnText, { color: "#16a34a" }]}>Opłacono</Text>
              </>
            )}
          </Pressable>
        )}
        <Pressable
          onPress={onDelete}
          disabled={deleting}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: "#ef444418", opacity: deleting || pressed ? 0.6 : 1 },
          ]}
          testID={`button-delete-${payment.id}`}
        >
          {deleting ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
          )}
        </Pressable>
      </View>
    </View>
  );
}

export default function TrainerPaymentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    amount: "",
    dueDate: toDateInputValue(new Date()),
    notes: "",
  });
  const [clientPickerVisible, setClientPickerVisible] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: payments = [], isLoading, refetch, isRefetching } = useQuery<ClientPayment[]>({
    queryKey: ["payments"],
    queryFn: () => apiGet<ClientPayment[]>("/api/payments"),
    enabled: !!user?.id,
    retry: 1,
  });

  const { data: upcoming = [] } = useQuery<ClientPayment[]>({
    queryKey: ["payments-upcoming"],
    queryFn: () => apiGet<ClientPayment[]>("/api/payments/upcoming"),
    enabled: !!user?.id,
    retry: 1,
  });

  const { data: clients = [] } = useQuery<TrainerClient[]>({
    queryKey: ["trainer-clients"],
    queryFn: () => apiGet<TrainerClient[]>("/api/trainer/clients"),
    enabled: !!user?.id,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: (data: { clientId: string; amount: number; dueDate: string; notes: string }) =>
      apiPost<ClientPayment>("/api/payments", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["payments-upcoming"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalVisible(false);
      setForm({ clientId: "", amount: "", dueDate: toDateInputValue(new Date()), notes: "" });
    },
    onError: (err: Error) => {
      Alert.alert("Błąd", err.message || "Nie udało się dodać płatności.");
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => apiPatch<ClientPayment>(`/api/payments/${id}/mark-paid`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["payments-upcoming"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMarkingPaidId(null);
    },
    onError: () => {
      Alert.alert("Błąd", "Nie udało się oznaczyć jako opłacone.");
      setMarkingPaidId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/api/payments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["payments-upcoming"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDeletingId(null);
    },
    onError: () => {
      Alert.alert("Błąd", "Nie udało się usunąć płatności.");
      setDeletingId(null);
    },
  });

  function getClientName(clientId: string) {
    const c = clients.find((c) => c.id === clientId);
    return c ? `${c.firstName} ${c.lastName}` : "Nieznany klient";
  }

  function handleCreate() {
    if (!form.clientId) {
      Alert.alert("Błąd", "Wybierz klienta.");
      return;
    }
    const amountNum = parseFloat(form.amount.replace(",", "."));
    if (!form.amount || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Błąd", "Podaj prawidłową kwotę.");
      return;
    }
    if (!form.dueDate) {
      Alert.alert("Błąd", "Podaj termin płatności.");
      return;
    }
    createMutation.mutate({
      clientId: form.clientId,
      amount: Math.round(amountNum * 100),
      dueDate: form.dueDate,
      notes: form.notes,
    });
  }

  function handleDelete(payment: ClientPayment) {
    Alert.alert(
      "Usuń płatność",
      `Czy na pewno chcesz usunąć płatność ${formatAmount(payment.amount)} dla ${getClientName(payment.clientId)}?`,
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń",
          style: "destructive",
          onPress: () => {
            setDeletingId(payment.id);
            deleteMutation.mutate(payment.id);
          },
        },
      ]
    );
  }

  const selectedClient = clients.find((c) => c.id === form.clientId);
  const upcomingIds = new Set(upcoming.map((p) => p.id));
  const unpaidPayments = payments.filter((p) => !p.isPaid && !upcomingIds.has(p.id));
  const paidPayments = payments.filter((p) => p.isPaid);

  return (
    <>
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: 16, paddingBottom: insets.bottom + 30 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => setModalVisible(true)}
          style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          testID="button-add-payment"
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Nowa płatność</Text>
        </Pressable>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Nadchodzące płatności ({upcoming.length})
                </Text>
                {upcoming.map((p) => (
                  <PaymentCard
                    key={p.id}
                    payment={p}
                    clientName={getClientName(p.clientId)}
                    colors={colors}
                    onMarkPaid={() => {
                      setMarkingPaidId(p.id);
                      markPaidMutation.mutate(p.id);
                    }}
                    onDelete={() => handleDelete(p)}
                    markingPaid={markingPaidId === p.id && markPaidMutation.isPending}
                    deleting={deletingId === p.id && deleteMutation.isPending}
                  />
                ))}
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              </>
            )}

            {unpaidPayments.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Oczekujące ({unpaidPayments.length})
                </Text>
                {unpaidPayments.map((p) => (
                  <PaymentCard
                    key={p.id}
                    payment={p}
                    clientName={getClientName(p.clientId)}
                    colors={colors}
                    onMarkPaid={() => {
                      setMarkingPaidId(p.id);
                      markPaidMutation.mutate(p.id);
                    }}
                    onDelete={() => handleDelete(p)}
                    markingPaid={markingPaidId === p.id && markPaidMutation.isPending}
                    deleting={deletingId === p.id && deleteMutation.isPending}
                  />
                ))}
              </>
            )}

            {paidPayments.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Opłacone ({paidPayments.length})
                </Text>
                {paidPayments.map((p) => (
                  <PaymentCard
                    key={p.id}
                    payment={p}
                    clientName={getClientName(p.clientId)}
                    colors={colors}
                    onMarkPaid={() => {}}
                    onDelete={() => handleDelete(p)}
                    markingPaid={false}
                    deleting={deletingId === p.id && deleteMutation.isPending}
                  />
                ))}
              </>
            )}

            {payments.length === 0 && (
              <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="wallet-outline" size={36} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Brak płatności</Text>
                <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                  Dodaj pierwszą płatność dla swojego klienta.
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
          <ScrollView
            style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}
            contentContainerStyle={{ gap: 14, paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Nowa płatność</Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Klient</Text>
              <Pressable
                onPress={() => setClientPickerVisible(true)}
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border }]}
                testID="button-pick-client"
              >
                <Text style={[{ color: selectedClient ? colors.foreground : colors.mutedForeground, fontSize: 15, fontFamily: "Inter_400Regular" }]}>
                  {selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : "Wybierz klienta"}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Kwota (zł)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                value={form.amount}
                onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))}
                placeholder="200"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
                testID="input-amount"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Termin płatności (RRRR-MM-DD)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                value={form.dueDate}
                onChangeText={(v) => setForm((f) => ({ ...f, dueDate: v }))}
                placeholder="2025-12-31"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="default"
                testID="input-due-date"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Opis (opcjonalnie)</Text>
              <TextInput
                style={[styles.inputMultiline, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                value={form.notes}
                onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
                placeholder="Dodatkowe informacje..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                testID="input-notes"
              />
            </View>

            {createMutation.isError && (
              <Text style={styles.errorText}>
                {(createMutation.error as Error)?.message ?? "Błąd dodawania płatności"}
              </Text>
            )}

            <View style={styles.modalBtns}>
              <Pressable
                onPress={() => { setModalVisible(false); setForm({ clientId: "", amount: "", dueDate: toDateInputValue(new Date()), notes: "" }); }}
                style={({ pressed }) => [styles.cancelBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                testID="button-cancel-payment"
              >
                <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>Anuluj</Text>
              </Pressable>
              <Pressable
                onPress={handleCreate}
                disabled={createMutation.isPending}
                style={({ pressed }) => [styles.submitBtn, { backgroundColor: colors.primary, opacity: createMutation.isPending || pressed ? 0.65 : 1 }]}
                testID="button-submit-payment"
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Dodaj płatność</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={clientPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setClientPickerVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setClientPickerVisible(false)}>
          <View style={[styles.pickerBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground, marginBottom: 8 }]}>Wybierz klienta</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {clients.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    setForm((f) => ({ ...f, clientId: c.id }));
                    setClientPickerVisible(false);
                  }}
                  style={({ pressed }) => [
                    styles.pickerItem,
                    { borderBottomColor: colors.border, backgroundColor: form.clientId === c.id ? colors.primary + "18" : "transparent", opacity: pressed ? 0.7 : 1 },
                  ]}
                  testID={`option-client-${c.id}`}
                >
                  <Text style={[styles.pickerItemText, { color: colors.foreground }]}>
                    {c.firstName} {c.lastName}
                  </Text>
                  {form.clientId === c.id && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </Pressable>
              ))}
              {clients.length === 0 && (
                <Text style={[styles.emptyDesc, { color: colors.mutedForeground, textAlign: "center", paddingVertical: 16 }]}>
                  Brak klientów
                </Text>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 14,
    marginBottom: 24,
  },
  addBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  loader: { marginTop: 40 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 10 },
  divider: { height: 1, marginVertical: 16 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    gap: 10,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardInfo: { flex: 1, gap: 2 },
  clientName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  amount: { fontSize: 22, fontFamily: "Inter_700Bold" },
  badgeCol: { alignItems: "flex-end" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  notes: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  cardActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  actionBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
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
    maxHeight: "85%",
  },
  pickerBox: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 24,
    maxHeight: "60%",
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputMultiline: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 80,
  },
  errorText: { fontSize: 13, color: "#ef4444", fontFamily: "Inter_400Regular" },
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
  submitBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  pickerItemText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
