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
  View,
} from "react-native";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

interface MedicalTest {
  id: string;
  testName: string;
  testType?: string | null;
  testDate: string;
  orderingProvider?: string | null;
  resultValue?: string | null;
  unit?: string | null;
  referenceRange?: string | null;
  notes?: string | null;
}

const TEST_TYPES = [
  { value: "blood", label: "Badanie krwi" },
  { value: "hormone", label: "Badanie hormonalne" },
  { value: "cardio", label: "Badanie kardiologiczne" },
  { value: "other", label: "Inne" },
];

function getTestTypeLabel(type?: string | null): string {
  return TEST_TYPES.find((t) => t.value === type)?.label ?? "Inne";
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("pl-PL");
  } catch {
    return d;
  }
}

export default function MedicalTestsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [modalVisible, setModalVisible] = useState(false);
  const [testName, setTestName] = useState("");
  const [testType, setTestType] = useState("blood");
  const [testDate, setTestDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const { data: tests, isLoading, refetch, isRefetching } = useQuery<MedicalTest[]>({
    queryKey: ["medical-tests"],
    queryFn: () => apiGet<MedicalTest[]>("/api/medical-tests"),
  });

  const createMutation = useMutation({
    mutationFn: (data: { testName: string; testType: string; testDate: string; notes: string }) =>
      apiPost("/api/medical-tests", {
        testName: data.testName,
        testType: data.testType,
        testDate: new Date(data.testDate).toISOString(),
        notes: data.notes || null,
      }),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["medical-tests"] });
      closeModal();
    },
    onError: () => {
      Alert.alert("Błąd", "Nie udało się dodać badania.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/medical-tests/${id}`),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      qc.invalidateQueries({ queryKey: ["medical-tests"] });
    },
    onError: () => {
      Alert.alert("Błąd", "Nie udało się usunąć badania.");
    },
  });

  function openModal() {
    setTestName("");
    setTestType("blood");
    setTestDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
  }

  function handleSubmit() {
    if (!testName.trim()) {
      Alert.alert("Błąd", "Podaj nazwę badania.");
      return;
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!testDate || !dateRegex.test(testDate) || isNaN(new Date(testDate).getTime())) {
      Alert.alert("Błąd", "Podaj poprawną datę w formacie RRRR-MM-DD (np. 2024-03-15).");
      return;
    }
    createMutation.mutate({ testName: testName.trim(), testType, testDate, notes });
  }

  function handleDelete(id: string) {
    Alert.alert(
      "Usuń badanie",
      "Czy na pewno chcesz usunąć to badanie?",
      [
        { text: "Anuluj", style: "cancel" },
        { text: "Usuń", style: "destructive", onPress: () => deleteMutation.mutate(id) },
      ],
    );
  }

  const sortedTests = [...(tests ?? [])].sort(
    (a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime(),
  );

  return (
    <>
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 90 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>Badania medyczne</Text>
            <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>
              Historia Twoich badań
            </Text>
          </View>
          <Pressable
            onPress={openModal}
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
            ]}
            testID="button-add-medical-test"
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Dodaj</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : sortedTests.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="flask-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Brak badań</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Dodaj swoje pierwsze badanie medyczne
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {sortedTests.map((test) => (
              <MedicalTestCard
                key={test.id}
                test={test}
                colors={colors}
                onDelete={() => handleDelete(test.id)}
                isDeleting={deleteMutation.isPending && deleteMutation.variables === test.id}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!createMutation.isPending) closeModal(); }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalTitleRow}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Dodaj badanie</Text>
              <Pressable
                onPress={() => { if (!createMutation.isPending) closeModal(); }}
                testID="button-close-modal"
              >
                <Ionicons name="close" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Nazwa badania *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="np. Morfologia, Cholesterol"
                  placeholderTextColor={colors.mutedForeground}
                  value={testName}
                  onChangeText={setTestName}
                  maxLength={200}
                  testID="input-test-name"
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Typ badania</Text>
                <View style={styles.typeRow}>
                  {TEST_TYPES.map((t) => (
                    <Pressable
                      key={t.value}
                      onPress={() => setTestType(t.value)}
                      style={({ pressed }) => [
                        styles.typeChip,
                        {
                          backgroundColor: testType === t.value ? colors.primary : colors.background,
                          borderColor: testType === t.value ? colors.primary : colors.border,
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                      testID={`button-type-${t.value}`}
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          { color: testType === t.value ? "#fff" : colors.foreground },
                        ]}
                      >
                        {t.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Data badania *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="RRRR-MM-DD (np. 2024-03-15)"
                  placeholderTextColor={colors.mutedForeground}
                  value={testDate}
                  onChangeText={setTestDate}
                  maxLength={10}
                  keyboardType="numbers-and-punctuation"
                  testID="input-test-date"
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Notatki</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.inputMultiline,
                    { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground },
                  ]}
                  placeholder="Dodatkowe informacje, wyniki..."
                  placeholderTextColor={colors.mutedForeground}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  maxLength={1000}
                  textAlignVertical="top"
                  testID="input-notes"
                />
              </View>
            </ScrollView>

            <Pressable
              onPress={handleSubmit}
              disabled={createMutation.isPending}
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: colors.primary, opacity: (createMutation.isPending || pressed) ? 0.75 : 1 },
              ]}
              testID="button-submit-test"
            >
              {createMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="checkmark-outline" size={18} color="#fff" />
              )}
              <Text style={styles.submitBtnText}>
                {createMutation.isPending ? "Dodawanie…" : "Dodaj badanie"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

function MedicalTestCard({
  test,
  colors,
  onDelete,
  isDeleting,
}: {
  test: MedicalTest;
  colors: ReturnType<typeof useColors>;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View
      style={[styles.testCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      testID={`card-medical-test-${test.id}`}
    >
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={styles.testCardHeader}
      >
        <View style={[styles.testIconWrap, { backgroundColor: colors.primary + "18" }]}>
          <Ionicons name="flask-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.testInfo}>
          <Text style={[styles.testName, { color: colors.foreground }]} numberOfLines={1}>
            {test.testName}
          </Text>
          <View style={styles.testMeta}>
            <Text style={[styles.testDate, { color: colors.mutedForeground }]}>
              {formatDate(test.testDate)}
            </Text>
            <View style={[styles.typeBadge, { backgroundColor: colors.primary + "18" }]}>
              <Text style={[styles.typeBadgeText, { color: colors.primary }]}>
                {getTestTypeLabel(test.testType)}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.testActions}>
          {isDeleting ? (
            <ActivityIndicator size="small" color={colors.mutedForeground} />
          ) : (
            <Pressable
              onPress={onDelete}
              style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.6 : 1 }]}
              testID={`button-delete-test-${test.id}`}
            >
              <Ionicons name="trash-outline" size={18} color="#e53935" />
            </Pressable>
          )}
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.mutedForeground}
          />
        </View>
      </Pressable>

      {expanded && (
        <View style={[styles.testCardBody, { borderTopColor: colors.border }]}>
          {test.resultValue != null && test.resultValue !== "" && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Wynik:</Text>
              <Text style={[styles.detailValue, { color: colors.foreground }]}>
                {test.resultValue}{test.unit ? ` ${test.unit}` : ""}
              </Text>
            </View>
          )}
          {test.referenceRange != null && test.referenceRange !== "" && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Zakres ref.:</Text>
              <Text style={[styles.detailValue, { color: colors.foreground }]}>{test.referenceRange}</Text>
            </View>
          )}
          {test.orderingProvider != null && test.orderingProvider !== "" && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Lekarz:</Text>
              <Text style={[styles.detailValue, { color: colors.foreground }]}>{test.orderingProvider}</Text>
            </View>
          )}
          {test.notes != null && test.notes !== "" && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Notatki:</Text>
              <Text style={[styles.detailValue, { color: colors.foreground }]}>{test.notes}</Text>
            </View>
          )}
          {!test.resultValue && !test.referenceRange && !test.orderingProvider && !test.notes && (
            <Text style={[styles.detailValue, { color: colors.mutedForeground }]}>Brak dodatkowych informacji</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
    flexWrap: "wrap",
  },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  pageSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 36,
    alignItems: "center",
    gap: 10,
    marginTop: 20,
  },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  list: { gap: 10 },
  testCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  testCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  testIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  testInfo: { flex: 1, gap: 4 },
  testName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  testMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  testDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  typeBadgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  testActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  deleteBtn: { padding: 4 },
  testCardBody: { borderTopWidth: 1, padding: 14, gap: 8 },
  detailRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  detailLabel: { fontSize: 13, fontFamily: "Inter_500Medium", minWidth: 90 },
  detailValue: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 30,
    maxHeight: "85%",
  },
  modalTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  inputMultiline: { minHeight: 90, textAlignVertical: "top" },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  typeChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 10,
    marginTop: 8,
  },
  submitBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
