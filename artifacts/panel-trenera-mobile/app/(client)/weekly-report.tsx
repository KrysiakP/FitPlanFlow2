import {
  ActivityIndicator,
  Alert,
  Image,
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
import * as ImagePicker from "expo-image-picker";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost, apiPatch, uploadImageToObjectStorage, setReportPhoto } from "@/lib/api";

interface WeeklyReport {
  id: string;
  reportDate: string;
  weight?: string | null;
  saturation?: string | null;
  chest?: string | null;
  waist?: string | null;
  hips?: string | null;
  arm?: string | null;
  leg?: string | null;
  cardio?: string | null;
  supplements?: string | null;
  mood?: string | null;
  thoughts?: string | null;
  photoUrl?: string | null;
  photoOriginalPath?: string | null;
  viewedByTrainer?: boolean | null;
  createdAt: string;
}

interface ReportFormData {
  weight: string;
  saturation: string;
  chest: string;
  waist: string;
  hips: string;
  arm: string;
  leg: string;
  cardio: string;
  supplements: string;
  mood: string;
  thoughts: string;
}

const EMPTY_FORM: ReportFormData = {
  weight: "",
  saturation: "",
  chest: "",
  waist: "",
  hips: "",
  arm: "",
  leg: "",
  cardio: "",
  supplements: "",
  mood: "",
  thoughts: "",
};

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return d;
  }
}

function formatShortDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("pl-PL");
  } catch {
    return d;
  }
}

function getThisMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

export default function WeeklyReportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ReportFormData>(EMPTY_FORM);
  const [reportDate, setReportDate] = useState(getThisMonday());

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMimeType, setPhotoMimeType] = useState<string>("image/jpeg");
  const [hasNewUpload, setHasNewUpload] = useState(false);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);

  const { data: reports, isLoading, refetch, isRefetching } = useQuery<WeeklyReport[]>({
    queryKey: ["client-reports"],
    queryFn: () => apiGet<WeeklyReport[]>("/api/reports"),
  });

  const saveMutation = useMutation({
    mutationFn: async (data: ReportFormData & { reportDate: string }) => {
      let uploadedObjectPath: string | null = null;

      if (hasNewUpload && photoUri) {
        const { objectPath } = await uploadImageToObjectStorage(photoUri, photoMimeType);
        uploadedObjectPath = objectPath;
      }

      const payload = {
        reportDate: new Date(data.reportDate),
        weight: data.weight || null,
        saturation: data.saturation || null,
        chest: data.chest || null,
        waist: data.waist || null,
        hips: data.hips || null,
        arm: data.arm || null,
        leg: data.leg || null,
        cardio: data.cardio || null,
        supplements: data.supplements || null,
        mood: data.mood || null,
        thoughts: data.thoughts || null,
      };

      let report: WeeklyReport;
      if (editingId) {
        report = await apiPatch<WeeklyReport>(`/api/reports/${editingId}`, payload);
      } else {
        report = await apiPost<WeeklyReport>("/api/reports", payload);
      }

      if (hasNewUpload && uploadedObjectPath) {
        try {
          await setReportPhoto(report.id, uploadedObjectPath);
        } catch (photoErr) {
          console.error("Photo attach failed (report saved):", photoErr);
          return { report, photoError: true };
        }
      }

      return { report, photoError: false };
    },
    onSuccess: ({ photoError }) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["client-reports"] });
      closeModal();
      if (photoError) {
        Alert.alert(
          "Raport zapisany",
          "Dane raportu zostały zapisane, ale nie udało się dołączyć zdjęcia. Spróbuj edytować raport i ponownie wybrać zdjęcie."
        );
      }
    },
    onError: (err) => {
      Alert.alert("Błąd", (err as Error).message || "Nie udało się zapisać raportu.");
    },
  });

  async function launchCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Brak dostępu", "Zezwól na dostęp do aparatu w ustawieniach urządzenia.");
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        setPhotoUri(asset.uri);
        setPhotoMimeType(asset.mimeType ?? "image/jpeg");
        setHasNewUpload(true);
      }
    } catch {
      Alert.alert("Błąd aparatu", "Nie udało się otworzyć aparatu. Spróbuj ponownie lub wybierz zdjęcie z galerii.");
    }
  }

  async function launchGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Brak dostępu", "Zezwól na dostęp do galerii w ustawieniach urządzenia.");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        setPhotoUri(asset.uri);
        setPhotoMimeType(asset.mimeType ?? "image/jpeg");
        setHasNewUpload(true);
      }
    } catch {
      Alert.alert("Błąd galerii", "Nie udało się otworzyć galerii. Spróbuj ponownie.");
    }
  }

  function pickPhoto() {
    Alert.alert(
      "Dodaj zdjęcie",
      "Skąd chcesz dodać zdjęcie?",
      [
        {
          text: "Aparat",
          onPress: launchCamera,
        },
        {
          text: "Galeria",
          onPress: launchGallery,
        },
        {
          text: "Anuluj",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  }

  function cancelNewPhoto() {
    setPhotoUri(null);
    setHasNewUpload(false);
  }

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setReportDate(getThisMonday());
    setPhotoUri(null);
    setHasNewUpload(false);
    setExistingPhotoUrl(null);
    setModalVisible(true);
  }

  function openEdit(report: WeeklyReport) {
    setEditingId(report.id);
    setForm({
      weight: report.weight ?? "",
      saturation: report.saturation ?? "",
      chest: report.chest ?? "",
      waist: report.waist ?? "",
      hips: report.hips ?? "",
      arm: report.arm ?? "",
      leg: report.leg ?? "",
      cardio: report.cardio ?? "",
      supplements: report.supplements ?? "",
      mood: report.mood ?? "",
      thoughts: report.thoughts ?? "",
    });
    setReportDate(report.reportDate ? report.reportDate.slice(0, 10) : getThisMonday());
    setPhotoUri(null);
    setHasNewUpload(false);
    setExistingPhotoUrl(report.photoUrl ?? null);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPhotoUri(null);
    setHasNewUpload(false);
    setExistingPhotoUrl(null);
  }

  function handleSave() {
    if (!reportDate) {
      Alert.alert("Błąd", "Wybierz datę raportu.");
      return;
    }
    saveMutation.mutate({ ...form, reportDate });
  }

  const displayPhotoUri = photoUri ?? existingPhotoUrl;

  const sorted = reports ? [...reports].sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()) : [];

  return (
    <>
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 90 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <View>
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>Raport tygodniowy</Text>
            <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>
              Śledź swoje cotygodniowe postępy
            </Text>
          </View>
          <Pressable
            onPress={openNew}
            style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
            testID="button-new-report"
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Nowy raport</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : sorted.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="document-text-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Brak raportów</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Dodaj swój pierwszy cotygodniowy raport postępów
            </Text>
          </View>
        ) : (
          sorted.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              colors={colors}
              onEdit={openEdit}
            />
          ))
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Pressable onPress={closeModal} testID="button-close-report-modal">
                <Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Anuluj</Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingId ? "Edytuj raport" : "Nowy raport"}
              </Text>
              <Pressable
                onPress={handleSave}
                disabled={saveMutation.isPending}
                testID="button-save-report"
              >
                {saveMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.modalSave, { color: colors.primary }]}>Zapisz</Text>
                )}
              </Pressable>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <SectionLabel icon="calendar-outline" label="Data raportu" colors={colors} />
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={reportDate}
                onChangeText={setReportDate}
                placeholder="RRRR-MM-DD"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                maxLength={10}
                testID="input-report-date"
              />

              <SectionLabel icon="scale-outline" label="Waga (np. 75.5kg)" colors={colors} />
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={form.weight}
                onChangeText={(v) => setForm((f) => ({ ...f, weight: v }))}
                placeholder="np. 75.5kg"
                placeholderTextColor={colors.mutedForeground}
                testID="input-weight"
              />

              <SectionLabel icon="battery-charging-outline" label="Poziom nasycenia" colors={colors} />
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={form.saturation}
                onChangeText={(v) => setForm((f) => ({ ...f, saturation: v }))}
                placeholder="np. dobry, średni, niski"
                placeholderTextColor={colors.mutedForeground}
                testID="input-saturation"
              />

              <Text style={[styles.groupTitle, { color: colors.foreground }]}>Pomiary (cm)</Text>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <SectionLabel icon="body-outline" label="Klatka" colors={colors} />
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    value={form.chest}
                    onChangeText={(v) => setForm((f) => ({ ...f, chest: v }))}
                    placeholder="cm"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="decimal-pad"
                    testID="input-chest"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <SectionLabel icon="body-outline" label="Talia" colors={colors} />
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    value={form.waist}
                    onChangeText={(v) => setForm((f) => ({ ...f, waist: v }))}
                    placeholder="cm"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="decimal-pad"
                    testID="input-waist"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <SectionLabel icon="body-outline" label="Biodro" colors={colors} />
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    value={form.hips}
                    onChangeText={(v) => setForm((f) => ({ ...f, hips: v }))}
                    placeholder="cm"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="decimal-pad"
                    testID="input-hips"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <SectionLabel icon="body-outline" label="Ramię" colors={colors} />
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    value={form.arm}
                    onChangeText={(v) => setForm((f) => ({ ...f, arm: v }))}
                    placeholder="cm"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="decimal-pad"
                    testID="input-arm"
                  />
                </View>
              </View>

              <SectionLabel icon="body-outline" label="Udo / łydka (cm)" colors={colors} />
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={form.leg}
                onChangeText={(v) => setForm((f) => ({ ...f, leg: v }))}
                placeholder="cm"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
                testID="input-leg"
              />

              <SectionLabel icon="bicycle-outline" label="Cardio" colors={colors} />
              <TextInput
                style={[styles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={form.cardio}
                onChangeText={(v) => setForm((f) => ({ ...f, cardio: v }))}
                placeholder="Opisz swoje aktywności cardio..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
                testID="input-cardio"
              />

              <SectionLabel icon="flask-outline" label="Suplementacja" colors={colors} />
              <TextInput
                style={[styles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={form.supplements}
                onChangeText={(v) => setForm((f) => ({ ...f, supplements: v }))}
                placeholder="Jakie suplementy przyjmujesz..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
                testID="input-supplements"
              />

              <SectionLabel icon="happy-outline" label="Samopoczucie" colors={colors} />
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={form.mood}
                onChangeText={(v) => setForm((f) => ({ ...f, mood: v }))}
                placeholder="np. świetne, zmęczony, zmotywowany"
                placeholderTextColor={colors.mutedForeground}
                testID="input-mood"
              />

              <SectionLabel icon="chatbubble-outline" label="Ogólne przemyślenia" colors={colors} />
              <TextInput
                style={[styles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={form.thoughts}
                onChangeText={(v) => setForm((f) => ({ ...f, thoughts: v }))}
                placeholder="Przemyślenia, uwagi, co chcesz zmienić..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={4}
                testID="input-thoughts"
              />

              <SectionLabel icon="camera-outline" label="Zdjęcie postępu" colors={colors} />

              {displayPhotoUri ? (
                <View style={styles.photoPreviewContainer}>
                  <Image
                    source={{ uri: displayPhotoUri }}
                    style={styles.photoPreview}
                    resizeMode="cover"
                    testID="img-report-photo-preview"
                  />
                  <View style={styles.photoActions}>
                    <Pressable
                      onPress={pickPhoto}
                      style={[styles.photoActionBtn, { backgroundColor: colors.card, borderColor: colors.border, flex: 1 }]}
                      testID="button-change-photo"
                    >
                      <Ionicons name="image-outline" size={16} color={colors.primary} />
                      <Text style={[styles.photoActionText, { color: colors.primary }]}>Zmień zdjęcie</Text>
                    </Pressable>
                    {hasNewUpload && (
                      <Pressable
                        onPress={cancelNewPhoto}
                        style={[styles.photoActionBtn, { backgroundColor: colors.card, borderColor: colors.border, flex: 1 }]}
                        testID="button-cancel-new-photo"
                      >
                        <Ionicons name="close-outline" size={16} color={colors.mutedForeground} />
                        <Text style={[styles.photoActionText, { color: colors.mutedForeground }]}>Anuluj</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={pickPhoto}
                  style={[styles.addPhotoBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  testID="button-add-photo"
                >
                  <Ionicons name="camera-outline" size={22} color={colors.primary} />
                  <Text style={[styles.addPhotoText, { color: colors.primary }]}>Dodaj zdjęcie</Text>
                </Pressable>
              )}

              {saveMutation.isError && (
                <Text style={styles.errorText}>
                  {(saveMutation.error as Error)?.message || "Błąd zapisu"}
                </Text>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function SectionLabel({ icon, label, colors }: { icon: string; label: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.labelRow}>
      <Ionicons name={icon as never} size={14} color={colors.mutedForeground} />
      <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function ReportCard({
  report,
  colors,
  onEdit,
}: {
  report: WeeklyReport;
  colors: ReturnType<typeof useColors>;
  onEdit: (r: WeeklyReport) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const measurements = [
    { label: "Klatka", value: report.chest },
    { label: "Talia", value: report.waist },
    { label: "Biodro", value: report.hips },
    { label: "Ramię", value: report.arm },
    { label: "Udo", value: report.leg },
  ].filter((m) => m.value);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} testID={`card-report-${report.id}`}>
      <Pressable
        onPress={() => setExpanded((e) => !e)}
        style={styles.cardHeader}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardDate, { color: colors.foreground }]}>
            {formatDate(report.reportDate)}
          </Text>
          {report.weight && (
            <Text style={[styles.cardWeight, { color: colors.mutedForeground }]}>
              Waga: {report.weight}
            </Text>
          )}
        </View>
        <View style={styles.cardRight}>
          {report.photoUrl && (
            <Ionicons name="image-outline" size={16} color={colors.mutedForeground} />
          )}
          {!report.viewedByTrainer && (
            <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
          )}
          <Pressable
            onPress={() => onEdit(report)}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            testID={`button-edit-report-${report.id}`}
          >
            <Ionicons name="pencil-outline" size={18} color={colors.primary} />
          </Pressable>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.mutedForeground}
          />
        </View>
      </Pressable>

      {expanded && (
        <View style={[styles.cardBody, { borderTopColor: colors.border }]}>
          {report.photoUrl && (
            <Image
              source={{ uri: report.photoUrl }}
              style={styles.cardPhoto}
              resizeMode="cover"
              testID={`img-report-photo-${report.id}`}
            />
          )}
          {report.saturation && (
            <Row icon="battery-charging-outline" label="Nasycenie" value={report.saturation} colors={colors} />
          )}
          {measurements.length > 0 && (
            <View style={styles.measureGrid}>
              {measurements.map((m) => (
                <View key={m.label} style={[styles.measureItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.measureLabel, { color: colors.mutedForeground }]}>{m.label}</Text>
                  <Text style={[styles.measureValue, { color: colors.foreground }]}>{m.value} cm</Text>
                </View>
              ))}
            </View>
          )}
          {report.cardio && (
            <Row icon="bicycle-outline" label="Cardio" value={report.cardio} colors={colors} multiline />
          )}
          {report.supplements && (
            <Row icon="flask-outline" label="Suplementacja" value={report.supplements} colors={colors} multiline />
          )}
          {report.mood && (
            <Row icon="happy-outline" label="Samopoczucie" value={report.mood} colors={colors} />
          )}
          {report.thoughts && (
            <Row icon="chatbubble-outline" label="Przemyślenia" value={report.thoughts} colors={colors} multiline />
          )}
          <Text style={[styles.cardCreated, { color: colors.mutedForeground }]}>
            Dodano: {formatShortDate(report.createdAt)}
            {!report.viewedByTrainer && " · Nieprzeczytane przez trenera"}
          </Text>
        </View>
      )}
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  colors,
  multiline,
}: {
  icon: string;
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  multiline?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLeft}>
        <Ionicons name={icon as never} size={14} color={colors.mutedForeground} />
        <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{label}:</Text>
      </View>
      <Text style={[styles.detailValue, { color: colors.foreground, flex: multiline ? 1 : undefined }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  pageHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
  },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  pageSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 40,
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  cardDate: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cardWeight: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  cardRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  cardBody: { borderTopWidth: 1, padding: 16, gap: 10 },
  cardPhoto: { width: "100%", height: 200, borderRadius: 10 },
  measureGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  measureItem: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    minWidth: 72,
  },
  measureLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  measureValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  detailRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  detailLeft: { flexDirection: "row", alignItems: "center", gap: 4, minWidth: 120 },
  detailLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  detailValue: { fontSize: 13, fontFamily: "Inter_400Regular" },
  cardCreated: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalCancel: { fontSize: 16, fontFamily: "Inter_400Regular" },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  modalSave: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  formContent: { padding: 20, gap: 4, paddingBottom: 60 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, marginBottom: 6 },
  inputLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 90,
    textAlignVertical: "top",
  },
  groupTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 16, marginBottom: 4 },
  row: { flexDirection: "row", gap: 12 },
  errorText: { fontSize: 13, color: "#e53935", fontFamily: "Inter_400Regular", marginTop: 8 },
  addPhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    borderStyle: "dashed",
    paddingVertical: 20,
    marginTop: 4,
  },
  addPhotoText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  photoPreviewContainer: { gap: 10, marginTop: 4 },
  photoPreview: { width: "100%", height: 200, borderRadius: 10 },
  photoActions: { flexDirection: "row", gap: 8 },
  photoActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
  },
  photoActionText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
