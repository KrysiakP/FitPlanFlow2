import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
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
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

interface Exercise {
  id: string;
  name: string;
  description?: string | null;
  videoUrl?: string | null;
  defaultSets?: number | null;
  defaultReps?: number | null;
  defaultLoad?: string | null;
  defaultRestTime?: number | null;
  trainerId?: string | null;
}

interface ExerciseFormState {
  name: string;
  description: string;
  videoUrl: string;
  defaultSets: string;
  defaultReps: string;
  defaultLoad: string;
  defaultRestTime: string;
}

const EMPTY_FORM: ExerciseFormState = {
  name: "",
  description: "",
  videoUrl: "",
  defaultSets: "",
  defaultReps: "",
  defaultLoad: "",
  defaultRestTime: "",
};

function exerciseToForm(ex: Exercise): ExerciseFormState {
  return {
    name: ex.name ?? "",
    description: ex.description ?? "",
    videoUrl: ex.videoUrl ?? "",
    defaultSets: ex.defaultSets != null ? String(ex.defaultSets) : "",
    defaultReps: ex.defaultReps != null ? String(ex.defaultReps) : "",
    defaultLoad: ex.defaultLoad ?? "",
    defaultRestTime: ex.defaultRestTime != null ? String(ex.defaultRestTime) : "",
  };
}

function truncateUrl(url: string, maxLen = 40): string {
  try {
    const parsed = new URL(url);
    const short = parsed.hostname.replace("www.", "") + parsed.pathname;
    return short.length > maxLen ? short.slice(0, maxLen) + "…" : short;
  } catch {
    return url.length > maxLen ? url.slice(0, maxLen) + "…" : url;
  }
}

export default function ExerciseLibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [viewingExercise, setViewingExercise] = useState<Exercise | null>(null);
  const [form, setForm] = useState<ExerciseFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<Exercise[]>({
    queryKey: ["exercises-library"],
    queryFn: () => apiGet<Exercise[]>("/api/exercises/library"),
    enabled: !!user?.id,
  });

  const exercises = (data ?? []).filter((ex) =>
    ex.name.toLowerCase().includes(search.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: (body: object) => apiPost<Exercise>("/api/exercises/library", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises-library"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeEditModal();
    },
    onError: () => {
      setFormError("Nie udało się dodać ćwiczenia. Spróbuj ponownie.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) =>
      apiPut<Exercise>(`/api/exercises/library/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises-library"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeEditModal();
    },
    onError: () => {
      setFormError("Nie udało się zaktualizować ćwiczenia. Spróbuj ponownie.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/api/exercises/library/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises-library"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => {
      Alert.alert("Błąd", "Nie udało się usunąć ćwiczenia.");
    },
  });

  function openAddModal() {
    setEditingExercise(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setEditModalVisible(true);
  }

  function openEditModal(ex: Exercise) {
    setEditingExercise(ex);
    setForm(exerciseToForm(ex));
    setFormError("");
    setEditModalVisible(true);
  }

  function closeEditModal() {
    setEditModalVisible(false);
    setEditingExercise(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  function openDetailsModal(ex: Exercise) {
    setViewingExercise(ex);
    setDetailsModalVisible(true);
  }

  function closeDetailsModal() {
    setDetailsModalVisible(false);
    setViewingExercise(null);
  }

  function handleCardPress(ex: Exercise, isOwn: boolean) {
    if (isOwn) {
      openEditModal(ex);
    } else {
      openDetailsModal(ex);
    }
  }

  function handleSave() {
    if (!form.name.trim()) {
      setFormError("Nazwa ćwiczenia jest wymagana.");
      return;
    }
    setFormError("");

    const body = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      videoUrl: form.videoUrl.trim() || null,
      defaultSets: form.defaultSets ? parseInt(form.defaultSets, 10) : null,
      defaultReps: form.defaultReps ? parseInt(form.defaultReps, 10) : null,
      defaultLoad: form.defaultLoad.trim() || null,
      defaultRestTime: form.defaultRestTime ? parseInt(form.defaultRestTime, 10) : null,
    };

    if (editingExercise) {
      updateMutation.mutate({ id: editingExercise.id, body });
    } else {
      createMutation.mutate(body);
    }
  }

  function confirmDelete(ex: Exercise) {
    Alert.alert(
      "Usuń ćwiczenie",
      `Czy na pewno chcesz usunąć ćwiczenie "${ex.name}"?`,
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń",
          style: "destructive",
          onPress: () => deleteMutation.mutate(ex.id),
        },
      ]
    );
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const ownUserId = user?.id;

  return (
    <>
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Szukaj ćwiczenia..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            testID="input-exercise-search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} testID="button-clear-search">
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={openAddModal}
          style={({ pressed }) => [
            styles.addBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          testID="button-add-exercise"
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Dodaj ćwiczenie</Text>
        </Pressable>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : isError ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="alert-circle-outline" size={36} color={colors.destructive} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Błąd ładowania</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Nie udało się załadować biblioteki ćwiczeń. Pociągnij, aby odświeżyć.
            </Text>
          </View>
        ) : exercises.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="barbell-outline" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {search ? "Brak wyników" : "Brak ćwiczeń"}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              {search
                ? `Nie znaleziono ćwiczeń pasujących do "${search}"`
                : "Dodaj pierwsze ćwiczenie do swojej biblioteki"}
            </Text>
          </View>
        ) : (
          exercises.map((ex) => {
            const isOwn = ex.trainerId === ownUserId;
            return (
              <Pressable
                key={ex.id}
                onPress={() => handleCardPress(ex, isOwn)}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                ]}
                testID={`card-exercise-${ex.id}`}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIcon, { backgroundColor: colors.primary + "1a" }]}>
                    <Ionicons name="barbell-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardName, { color: colors.foreground }]}>{ex.name}</Text>
                    {ex.description ? (
                      <Text
                        style={[styles.cardDesc, { color: colors.mutedForeground }]}
                        numberOfLines={2}
                      >
                        {ex.description}
                      </Text>
                    ) : null}
                    {ex.videoUrl ? (
                      <View style={styles.videoRow}>
                        <Ionicons name="videocam-outline" size={13} color={colors.primary} />
                        <Text style={[styles.videoUrl, { color: colors.primary }]} numberOfLines={1}>
                          {truncateUrl(ex.videoUrl)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {isOwn ? (
                    <View style={styles.cardActions}>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation?.();
                          openEditModal(ex);
                        }}
                        style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
                        testID={`button-edit-exercise-${ex.id}`}
                        hitSlop={8}
                      >
                        <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                      </Pressable>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation?.();
                          confirmDelete(ex);
                        }}
                        style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
                        testID={`button-delete-exercise-${ex.id}`}
                        hitSlop={8}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                      </Pressable>
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} style={styles.chevron} />
                  )}
                </View>

                {(ex.defaultSets != null || ex.defaultReps != null || ex.defaultLoad || ex.defaultRestTime != null) && (
                  <View style={[styles.cardMeta, { borderTopColor: colors.border }]}>
                    {ex.defaultSets != null && (
                      <View style={styles.metaChip}>
                        <Ionicons name="layers-outline" size={13} color={colors.mutedForeground} />
                        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                          {ex.defaultSets} serie
                        </Text>
                      </View>
                    )}
                    {ex.defaultReps != null && (
                      <View style={styles.metaChip}>
                        <Ionicons name="repeat-outline" size={13} color={colors.mutedForeground} />
                        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                          {ex.defaultReps} pow.
                        </Text>
                      </View>
                    )}
                    {ex.defaultLoad ? (
                      <View style={styles.metaChip}>
                        <Ionicons name="fitness-outline" size={13} color={colors.mutedForeground} />
                        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                          {ex.defaultLoad}
                        </Text>
                      </View>
                    ) : null}
                    {ex.defaultRestTime != null && (
                      <View style={styles.metaChip}>
                        <Ionicons name="timer-outline" size={13} color={colors.mutedForeground} />
                        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                          {ex.defaultRestTime}s odpoczynku
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Edit / Add Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeEditModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeEditModal} />
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 },
            ]}
          >
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingExercise ? "Edytuj ćwiczenie" : "Nowe ćwiczenie"}
              </Text>
              <Pressable
                onPress={closeEditModal}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                testID="button-close-exercise-modal"
              >
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.formRow}>
                <Text style={[styles.formRowLabel, { color: colors.mutedForeground }]}>Nazwa *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="np. Wyciskanie sztangi leżąc"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.name}
                  onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                  returnKeyType="next"
                  testID="input-form-name"
                />
              </View>

              <View style={styles.formRow}>
                <Text style={[styles.formRowLabel, { color: colors.mutedForeground }]}>Opis</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.inputMultiline,
                    { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground },
                  ]}
                  placeholder="Opis techniki wykonania..."
                  placeholderTextColor={colors.mutedForeground}
                  value={form.description}
                  onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                  multiline
                  numberOfLines={3}
                  testID="input-form-description"
                />
              </View>

              <View style={styles.rowThree}>
                <View style={styles.rowThreeItem}>
                  <Text style={[styles.formRowLabel, { color: colors.mutedForeground }]}>Serie</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="3"
                    placeholderTextColor={colors.mutedForeground}
                    value={form.defaultSets}
                    onChangeText={(v) => setForm((f) => ({ ...f, defaultSets: v.replace(/[^0-9]/g, "") }))}
                    keyboardType="numeric"
                    returnKeyType="next"
                    testID="input-form-sets"
                  />
                </View>
                <View style={styles.rowThreeItem}>
                  <Text style={[styles.formRowLabel, { color: colors.mutedForeground }]}>Powtórzenia</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="10"
                    placeholderTextColor={colors.mutedForeground}
                    value={form.defaultReps}
                    onChangeText={(v) => setForm((f) => ({ ...f, defaultReps: v.replace(/[^0-9]/g, "") }))}
                    keyboardType="numeric"
                    returnKeyType="next"
                    testID="input-form-reps"
                  />
                </View>
                <View style={styles.rowThreeItem}>
                  <Text style={[styles.formRowLabel, { color: colors.mutedForeground }]}>Obciążenie</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="20kg"
                    placeholderTextColor={colors.mutedForeground}
                    value={form.defaultLoad}
                    onChangeText={(v) => setForm((f) => ({ ...f, defaultLoad: v }))}
                    returnKeyType="next"
                    testID="input-form-load"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <Text style={[styles.formRowLabel, { color: colors.mutedForeground }]}>Odpoczynek (sekundy)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="60"
                  placeholderTextColor={colors.mutedForeground}
                  value={form.defaultRestTime}
                  onChangeText={(v) => setForm((f) => ({ ...f, defaultRestTime: v.replace(/[^0-9]/g, "") }))}
                  keyboardType="numeric"
                  returnKeyType="next"
                  testID="input-form-rest"
                />
              </View>

              <View style={styles.formRow}>
                <Text style={[styles.formRowLabel, { color: colors.mutedForeground }]}>Link do wideo</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="https://youtube.com/..."
                  placeholderTextColor={colors.mutedForeground}
                  value={form.videoUrl}
                  onChangeText={(v) => setForm((f) => ({ ...f, videoUrl: v }))}
                  keyboardType="url"
                  autoCapitalize="none"
                  returnKeyType="done"
                  testID="input-form-video"
                />
              </View>

              {formError ? (
                <View style={[styles.errorBox, { backgroundColor: colors.destructive + "18", borderColor: colors.destructive + "40" }]}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{formError}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={handleSave}
                disabled={isSaving}
                style={({ pressed }) => [
                  styles.saveBtn,
                  { backgroundColor: colors.primary, opacity: pressed || isSaving ? 0.75 : 1 },
                ]}
                testID="button-save-exercise"
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingExercise ? "Zapisz zmiany" : "Dodaj ćwiczenie"}
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Read-only Details Modal (for default / non-own exercises) */}
      <Modal
        visible={detailsModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeDetailsModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeDetailsModal} />
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 24 },
            ]}
          >
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {viewingExercise?.name ?? "Ćwiczenie"}
              </Text>
              <Pressable
                onPress={closeDetailsModal}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                testID="button-close-details-modal"
              >
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {viewingExercise?.description ? (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Opis</Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>
                    {viewingExercise.description}
                  </Text>
                </View>
              ) : null}

              {(viewingExercise?.defaultSets != null ||
                viewingExercise?.defaultReps != null ||
                viewingExercise?.defaultLoad ||
                viewingExercise?.defaultRestTime != null) && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Domyślne parametry</Text>
                  <View style={styles.detailGrid}>
                    {viewingExercise?.defaultSets != null && (
                      <View style={[styles.detailGridItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={[styles.detailGridNum, { color: colors.foreground }]}>{viewingExercise.defaultSets}</Text>
                        <Text style={[styles.detailGridLbl, { color: colors.mutedForeground }]}>serie</Text>
                      </View>
                    )}
                    {viewingExercise?.defaultReps != null && (
                      <View style={[styles.detailGridItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={[styles.detailGridNum, { color: colors.foreground }]}>{viewingExercise.defaultReps}</Text>
                        <Text style={[styles.detailGridLbl, { color: colors.mutedForeground }]}>pow.</Text>
                      </View>
                    )}
                    {viewingExercise?.defaultLoad ? (
                      <View style={[styles.detailGridItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={[styles.detailGridNum, { color: colors.foreground }]}>{viewingExercise.defaultLoad}</Text>
                        <Text style={[styles.detailGridLbl, { color: colors.mutedForeground }]}>obciążenie</Text>
                      </View>
                    ) : null}
                    {viewingExercise?.defaultRestTime != null && (
                      <View style={[styles.detailGridItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={[styles.detailGridNum, { color: colors.foreground }]}>{viewingExercise.defaultRestTime}s</Text>
                        <Text style={[styles.detailGridLbl, { color: colors.mutedForeground }]}>odpoczynek</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {viewingExercise?.videoUrl ? (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Link do wideo</Text>
                  <Pressable
                    onPress={() => viewingExercise.videoUrl && Linking.openURL(viewingExercise.videoUrl)}
                    style={({ pressed }) => [
                      styles.videoLinkBtn,
                      { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                    ]}
                    testID="button-open-video"
                  >
                    <Ionicons name="videocam-outline" size={18} color={colors.primary} />
                    <Text style={[styles.videoLinkText, { color: colors.primary }]} numberOfLines={1}>
                      {truncateUrl(viewingExercise.videoUrl, 48)}
                    </Text>
                    <Ionicons name="open-outline" size={16} color={colors.primary} />
                  </Pressable>
                </View>
              ) : null}

              {!viewingExercise?.description &&
                viewingExercise?.defaultSets == null &&
                viewingExercise?.defaultReps == null &&
                !viewingExercise?.defaultLoad &&
                viewingExercise?.defaultRestTime == null &&
                !viewingExercise?.videoUrl && (
                  <Text style={[styles.noDetails, { color: colors.mutedForeground }]}>
                    Brak dodatkowych informacji o tym ćwiczeniu.
                  </Text>
                )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    paddingVertical: 0,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  loader: { marginTop: 40 },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 21 },
  cardDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginTop: 2,
  },
  videoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  videoUrl: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flexShrink: 1,
  },
  cardActions: { flexDirection: "row", gap: 4, flexShrink: 0 },
  iconBtn: { padding: 6 },
  chevron: { marginTop: 2, flexShrink: 0 },
  cardMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "92%",
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", flex: 1, marginRight: 8 },
  modalScroll: { paddingHorizontal: 20 },
  formRow: { marginBottom: 14 },
  formRowLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  rowThree: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  rowThreeItem: { flex: 1 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  detailSection: { marginBottom: 20 },
  detailLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  detailValue: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  detailGridItem: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    minWidth: 70,
  },
  detailGridNum: { fontSize: 18, fontFamily: "Inter_700Bold" },
  detailGridLbl: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  videoLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  videoLinkText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  noDetails: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8, marginBottom: 16 },
});
