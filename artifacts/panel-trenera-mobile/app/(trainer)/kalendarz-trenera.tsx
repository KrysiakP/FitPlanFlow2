import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Calendar, type DateData } from "react-native-calendars";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost } from "@/lib/api";

interface SessionBooking {
  id: string;
  clientId: string | null;
  guestName?: string | null;
  scheduledAt: string;
  durationMinutes: number;
  location?: string | null;
  status: string;
}

interface TrainerClient {
  id: string;
  firstName: string;
  lastName: string;
}

function toDayKey(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const DURATION_OPTIONS = [30, 45, 60, 90];

export default function TrainerCalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const qc = useQueryClient();

  const [selectedDay, setSelectedDay] = useState(toDayKey(new Date().toISOString()));

  const { data: sessions, isLoading, isError, refetch } = useQuery<SessionBooking[]>({
    queryKey: ["trainer-sessions"],
    queryFn: () => apiGet<SessionBooking[]>("/api/trainer/sessions"),
  });

  const { data: clients } = useQuery<TrainerClient[]>({
    queryKey: ["trainer-clients"],
    queryFn: () => apiGet<TrainerClient[]>("/api/trainer/clients"),
  });

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    (clients ?? []).forEach((c) => map.set(c.id, `${c.firstName} ${c.lastName}`));
    return map;
  }, [clients]);

  const scheduled = useMemo(
    () => (sessions ?? []).filter((s) => s.status === "scheduled"),
    [sessions]
  );

  const markedDates = useMemo(() => {
    const marks: Record<string, { marked: boolean; dotColor: string; selected?: boolean; selectedColor?: string }> = {};
    scheduled.forEach((s) => {
      const key = toDayKey(s.scheduledAt);
      marks[key] = { marked: true, dotColor: colors.primary };
    });
    marks[selectedDay] = { ...(marks[selectedDay] ?? { marked: false, dotColor: colors.primary }), selected: true, selectedColor: colors.primary };
    return marks;
  }, [scheduled, selectedDay, colors.primary]);

  const dayBookings = useMemo(
    () =>
      scheduled
        .filter((s) => toDayKey(s.scheduledAt) === selectedDay)
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [scheduled, selectedDay]
  );

  // --- Add session modal state ---
  const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState<"client" | "guest">("client");
  const [clientId, setClientId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [sessionDate, setSessionDate] = useState(() => new Date());
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState("");
  const [clientPickerVisible, setClientPickerVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  function resetForm() {
    setMode("client");
    setClientId("");
    setGuestName("");
    setSessionDate(new Date());
    setDuration(60);
    setLocation("");
  }

  // Collapses the native date/time pickers before dismissing the Modal —
  // closing both at once can leave an invisible native picker view stuck
  // on top of the screen, blocking touches on everything but the tab bar.
  function closeModal() {
    setShowDatePicker(false);
    setShowTimePicker(false);
    setTimeout(() => {
      setModalVisible(false);
      resetForm();
    }, 50);
  }

  const createMutation = useMutation({
    mutationFn: () =>
      apiPost("/api/sessions", {
        clientId: mode === "client" ? clientId : undefined,
        guestName: mode === "guest" ? guestName.trim() : undefined,
        scheduledAt: sessionDate.toISOString(),
        durationMinutes: duration,
        location: location.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trainer-sessions"] });
      closeModal();
    },
  });

  const canSubmit =
    (mode === "client" ? !!clientId : guestName.trim().length > 0) && !createMutation.isPending;

  const selectedClientLabel = clientId ? clientNameById.get(clientId) : undefined;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.stickyHeader, { paddingTop: topPad + 8, backgroundColor: colors.background }]}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Kalendarz trenera</Text>
        <Pressable
          onPress={() => setModalVisible(true)}
          style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
          testID="button-add-session"
        >
          <Ionicons name="add" size={22} color={colors.primaryForeground} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={[styles.centered, { paddingHorizontal: 32 }]}>
          <Ionicons name="cloud-offline-outline" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.foreground, fontFamily: "Inter_600SemiBold", marginTop: 8 }]}>
            Błąd ładowania
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground, marginTop: 4, textAlign: "center" }]}>
            Nie udało się pobrać sesji. Sprawdź połączenie.
          </Text>
          <Pressable onPress={() => refetch()} style={{ marginTop: 12 }} testID="button-retry-calendar">
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>Spróbuj ponownie</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <Calendar
            current={selectedDay}
            onDayPress={(day: DateData) => setSelectedDay(day.dateString)}
            markedDates={markedDates}
            theme={{
              backgroundColor: colors.background,
              calendarBackground: colors.card,
              textSectionTitleColor: colors.mutedForeground,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: "#fff",
              todayTextColor: colors.primary,
              dayTextColor: colors.foreground,
              textDisabledColor: colors.mutedForeground + "55",
              dotColor: colors.primary,
              monthTextColor: colors.foreground,
              arrowColor: colors.primary,
            }}
            style={[styles.calendar, { borderColor: colors.border }]}
          />

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Sesje — {selectedDay}
          </Text>

          {dayBookings.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="calendar-clear-outline" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Brak sesji tego dnia</Text>
            </View>
          ) : (
            dayBookings.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => { if (s.clientId) router.push(`/client/${s.clientId}`); }}
                style={({ pressed }) => [
                  styles.sessionCard,
                  { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
                testID={`card-calendar-session-${s.id}`}
              >
                <View style={[styles.timeBox, { backgroundColor: colors.primary + "18" }]}>
                  <Text style={[styles.timeText, { color: colors.primary }]}>{formatTime(s.scheduledAt)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.clientName, { color: colors.foreground }]}>
                    {s.clientId ? (clientNameById.get(s.clientId) ?? "Podopieczny") : (s.guestName || "Podopieczny")}
                  </Text>
                  <Text style={[styles.sessionMeta, { color: colors.mutedForeground }]}>
                    {s.durationMinutes} min{s.location ? ` · ${s.location}` : ""}
                    {!s.clientId ? " · bez aplikacji" : ""}
                  </Text>
                </View>
                {!!s.clientId && <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />}
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}
            contentContainerStyle={{ gap: 14, paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Nowy trening</Text>

            <View style={[styles.modeToggle, { backgroundColor: colors.accent, borderColor: colors.border }]}>
              <Pressable
                onPress={() => setMode("client")}
                style={[styles.modeOption, mode === "client" && { backgroundColor: colors.primary }]}
                testID="button-mode-client"
              >
                <Text style={[styles.modeOptionText, { color: mode === "client" ? colors.primaryForeground : colors.mutedForeground }]}>
                  Podopieczny z apki
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMode("guest")}
                style={[styles.modeOption, mode === "guest" && { backgroundColor: colors.primary }]}
                testID="button-mode-guest"
              >
                <Text style={[styles.modeOptionText, { color: mode === "guest" ? colors.primaryForeground : colors.mutedForeground }]}>
                  Bez aplikacji
                </Text>
              </Pressable>
            </View>

            {mode === "client" ? (
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Podopieczny</Text>
                <Pressable
                  onPress={() => setClientPickerVisible(true)}
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border }]}
                  testID="button-pick-session-client"
                >
                  <Text style={{ color: selectedClientLabel ? colors.foreground : colors.mutedForeground, fontSize: 15, fontFamily: "Inter_400Regular" }}>
                    {selectedClientLabel ?? "Wybierz podopiecznego"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Imię i nazwisko</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                  value={guestName}
                  onChangeText={setGuestName}
                  placeholder="np. Jan Kowalski"
                  placeholderTextColor={colors.mutedForeground}
                  testID="input-guest-name"
                />
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Data</Text>
              <Pressable
                onPress={() => setShowDatePicker((v) => !v)}
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border }]}
                testID="input-session-date"
              >
                <Text style={{ color: colors.foreground, fontSize: 15 }}>
                  {sessionDate.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}
                </Text>
                <Ionicons name="calendar-outline" size={16} color={colors.mutedForeground} />
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={sessionDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  onChange={(_event, date) => {
                    setShowDatePicker(Platform.OS === "ios");
                    if (date) {
                      const next = new Date(sessionDate);
                      next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                      setSessionDate(next);
                    }
                  }}
                />
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Godzina</Text>
              <Pressable
                onPress={() => setShowTimePicker((v) => !v)}
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border }]}
                testID="input-session-time"
              >
                <Text style={{ color: colors.foreground, fontSize: 15 }}>{formatTime(sessionDate.toISOString())}</Text>
                <Ionicons name="time-outline" size={16} color={colors.mutedForeground} />
              </Pressable>
              {showTimePicker && (
                <DateTimePicker
                  value={sessionDate}
                  mode="time"
                  is24Hour
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_event, date) => {
                    setShowTimePicker(Platform.OS === "ios");
                    if (date) {
                      const next = new Date(sessionDate);
                      next.setHours(date.getHours(), date.getMinutes());
                      setSessionDate(next);
                    }
                  }}
                />
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Czas trwania</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {DURATION_OPTIONS.map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => setDuration(d)}
                    style={[
                      styles.durationOption,
                      { borderColor: colors.border, backgroundColor: duration === d ? colors.primary : colors.background },
                    ]}
                    testID={`button-duration-${d}`}
                  >
                    <Text style={{ color: duration === d ? colors.primaryForeground : colors.foreground, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                      {d} min
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Miejsce (opcjonalnie)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                value={location}
                onChangeText={setLocation}
                placeholder="np. Siłownia XYZ"
                placeholderTextColor={colors.mutedForeground}
                testID="input-session-location"
              />
            </View>

            {createMutation.isError && (
              <Text style={styles.errorText}>
                {(createMutation.error as Error)?.message ?? "Błąd dodawania treningu"}
              </Text>
            )}

            <View style={styles.modalBtns}>
              <Pressable
                onPress={closeModal}
                style={({ pressed }) => [styles.cancelBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                testID="button-cancel-session"
              >
                <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>Anuluj</Text>
              </Pressable>
              <Pressable
                onPress={() => createMutation.mutate()}
                disabled={!canSubmit}
                style={({ pressed }) => [styles.submitBtn, { backgroundColor: colors.primary, opacity: !canSubmit || pressed ? 0.65 : 1 }]}
                testID="button-submit-session"
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Dodaj trening</Text>
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
            <Text style={[styles.modalTitle, { color: colors.foreground, marginBottom: 8 }]}>Wybierz podopiecznego</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {(clients ?? []).map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    setClientId(c.id);
                    setClientPickerVisible(false);
                  }}
                  style={({ pressed }) => [
                    styles.pickerItem,
                    { borderBottomColor: colors.border, backgroundColor: clientId === c.id ? colors.primary + "18" : "transparent", opacity: pressed ? 0.7 : 1 },
                  ]}
                  testID={`option-session-client-${c.id}`}
                >
                  <Text style={[styles.pickerItemText, { color: colors.foreground }]}>
                    {c.firstName} {c.lastName}
                  </Text>
                  {clientId === c.id && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </Pressable>
              ))}
              {(clients ?? []).length === 0 && (
                <Text style={{ color: colors.mutedForeground, textAlign: "center", paddingVertical: 16, fontFamily: "Inter_400Regular" }}>
                  Brak podopiecznych — użyj opcji "Bez aplikacji"
                </Text>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  stickyHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingBottom: 8 },
  pageTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  addBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center" },
  content: { paddingHorizontal: 20 },
  calendar: { borderRadius: 14, borderWidth: 1, marginBottom: 16, overflow: "hidden" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 10 },
  emptyBox: { borderRadius: 14, borderWidth: 1, padding: 24, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  sessionCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
  timeBox: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  timeText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  clientName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sessionMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: 24, maxHeight: "85%" },
  pickerBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: 24, maxHeight: "60%" },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modeToggle: { flexDirection: "row", borderRadius: 12, borderWidth: 1, padding: 4, gap: 4 },
  modeOption: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: "center" },
  modeOptionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
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
  durationOption: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  errorText: { fontSize: 13, color: "#ef4444", fontFamily: "Inter_400Regular" },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  submitBtn: { flex: 1, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  submitBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  pickerItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1 },
  pickerItemText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
