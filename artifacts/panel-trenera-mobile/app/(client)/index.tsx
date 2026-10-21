import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { nextWorkout } from "@/lib/nextWorkout";
import { groupSlotsByDay, slotTimeLabel, type Slot } from "@/lib/slots";
import { apiGet, apiPost } from "@/lib/api";

type Colors = ReturnType<typeof useColors>;
type IoniconsName = ComponentProps<typeof Ionicons>["name"];

interface Assignment {
  plan?: {
    name: string;
    description?: string | null;
    workouts?: { id: string; name: string; orderIndex?: number | null; exercises?: unknown[] }[];
  } | null;
}

interface InvitationTrainer {
  firstName: string;
  lastName: string;
  email: string;
}

interface ClientSession {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  location?: string | null;
  cancellableUntil?: string; // until then the client may cancel on their own (24 h before the start)
}

interface PendingInvitation {
  id: string;
  clientEmail: string;
  status: string;
  createdAt: string;
  trainer?: InvitationTrainer;
}

export default function ClientDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: assignment, isLoading, refetch: refetchAssignment, isRefetching } = useQuery<Assignment>({
    queryKey: ["client-assignment"],
    queryFn: () => apiGet<Assignment>("/api/client/assignment"),
    enabled: !!user?.id,
    retry: 1,
  });

  const { data: finishedSessions } = useQuery<{ workoutId: string; completedAt: string }[]>({
    queryKey: ["workout-sessions", user?.id],
    queryFn: () => apiGet<{ workoutId: string; completedAt: string }[]>("/api/workout-sessions"),
    enabled: !!user?.id && !!assignment?.plan,
    staleTime: 1000 * 60 * 2,
  });

  const upNext = assignment?.plan?.workouts ? nextWorkout(assignment.plan.workouts, finishedSessions ?? []) : null;

  const { data: invitations, refetch: refetchInvitations } = useQuery<PendingInvitation[]>({
    queryKey: ["client-invitations"],
    queryFn: () => apiGet<PendingInvitation[]>("/api/invitations"),
    enabled: !!user?.id,
    retry: 1,
  });

  const pendingInvitations = (invitations ?? []).filter((i) => i.status === "pending");

  const { data: upcomingSessions } = useQuery<ClientSession[]>({
    queryKey: ["client-sessions"],
    queryFn: () => apiGet<ClientSession[]>("/api/client/sessions"),
    enabled: !!user?.id,
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => apiPost(`/api/invitations/${id}/accept`, {}),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["client-invitations"] });
      qc.invalidateQueries({ queryKey: ["client-assignment"] });
    },
    onError: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Błąd", "Nie udało się zaakceptować zaproszenia. Spróbuj ponownie.");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiPost(`/api/invitations/${id}/reject`, {}),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      qc.invalidateQueries({ queryKey: ["client-invitations"] });
    },
    onError: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Błąd", "Nie udało się odrzucić zaproszenia. Spróbuj ponownie.");
    },
  });

  // The trainer's free slots: one tap on a time, one confirmation, and it is booked
  const { data: slotData } = useQuery<{ trainerName: string | null; slots: Slot[] }>({
    queryKey: ["client-trainer-slots"],
    queryFn: () => apiGet<{ trainerName: string | null; slots: Slot[] }>("/api/client/trainer-slots"),
  });
  const slotDays = groupSlotsByDay(slotData?.slots ?? [], 5);

  const bookSlotMutation = useMutation({
    mutationFn: (slot: Slot) => apiPost("/api/client/book-slot", { startsAt: slot.startsAt }),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["client-trainer-slots"] });
      qc.invalidateQueries({ queryKey: ["client-sessions"] });
    },
    onError: (error: Error) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Nie udało się zarezerwować", error.message);
      qc.invalidateQueries({ queryKey: ["client-trainer-slots"] });
    },
  });

  function confirmBook(slot: Slot, dayLabel: string) {
    Alert.alert("Zarezerwować termin?", `${dayLabel}, ${slotTimeLabel(slot.startsAt)} (${slot.durationMinutes} min)`, [
      { text: "Anuluj", style: "cancel" },
      { text: "Zarezerwuj", onPress: () => bookSlotMutation.mutate(slot) },
    ]);
  }

  const cancelSessionMutation = useMutation({
    mutationFn: (id: string) => apiPost(`/api/client/sessions/${id}/cancel`, {}),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["client-sessions"] });
    },
    onError: (error: Error) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Nie udało się odwołać", error.message);
      qc.invalidateQueries({ queryKey: ["client-sessions"] });
    },
  });

  function confirmCancelSession(sessionId: string) {
    Alert.alert("Odwołać termin?", "Trener dostanie powiadomienie o odwołaniu.", [
      { text: "Zostaw", style: "cancel" },
      { text: "Odwołaj termin", style: "destructive", onPress: () => cancelSessionMutation.mutate(sessionId) },
    ]);
  }

  function confirmReject(invitationId: string, trainerName: string) {
    Alert.alert(
      "Odrzucić zaproszenie?",
      `Zaproszenie od ${trainerName} zostanie odrzucone.`,
      [
        { text: "Anuluj", style: "cancel" },
        { text: "Odrzuć", style: "destructive", onPress: () => rejectMutation.mutate(invitationId) },
      ]
    );
  }

  function handleRefresh() {
    void refetchAssignment();
    void refetchInvitations();
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: insets.bottom + 90 },
      ]}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Witaj,</Text>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {user?.firstName} {user?.lastName}
          </Text>
        </View>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
            {(user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")}
          </Text>
        </View>
      </View>

      {slotDays.length > 0 && (
        <View style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]} testID="card-book-slot">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={[styles.sessionCardTitle, { color: colors.foreground }]}>Umów trening</Text>
          </View>
          <Text style={{ fontSize: 12, color: colors.mutedForeground, marginBottom: 8 }}>
            Wolne terminy trenera{slotData?.trainerName ? ` ${slotData.trainerName}` : ""}. Odwołać możesz najpóźniej 24 h przed.
          </Text>
          {slotDays.map((day) => (
            <View key={day.key} style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground, textTransform: "capitalize" }}>{day.label}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                {day.slots.map((slot) => (
                  <Pressable
                    key={slot.startsAt}
                    onPress={() => confirmBook(slot, day.label)}
                    disabled={bookSlotMutation.isPending}
                    accessibilityRole="button"
                    accessibilityLabel={`Zarezerwuj ${day.label}, ${slotTimeLabel(slot.startsAt)}`}
                    style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
                    testID={`slot-${slot.startsAt}`}
                  >
                    <Text style={{ fontSize: 13, color: colors.foreground }}>{slotTimeLabel(slot.startsAt)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {(upcomingSessions ?? []).length > 0 && (
        <View style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Ionicons name="calendar" size={18} color={colors.primary} />
            <Text style={[styles.sessionCardTitle, { color: colors.foreground }]}>Najbliższa sesja</Text>
          </View>
          <Text style={[styles.sessionCardDate, { color: colors.foreground }]}>
            {new Date(upcomingSessions![0].scheduledAt).toLocaleString("pl-PL", {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
          {upcomingSessions![0].location ? (
            <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 2 }}>
              {upcomingSessions![0].location}
            </Text>
          ) : null}
          {upcomingSessions![0].cancellableUntil && new Date(upcomingSessions![0].cancellableUntil) > new Date() ? (
            <Pressable
              onPress={() => confirmCancelSession(upcomingSessions![0].id)}
              disabled={cancelSessionMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="Odwołaj najbliższy termin"
              style={{ alignSelf: "flex-start", marginTop: 8, paddingVertical: 6 }}
              testID="button-cancel-session"
            >
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#dc2626" }}>
                Odwołaj termin
              </Text>
            </Pressable>
          ) : (
            <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 8 }}>
              Termin można odwołać do 24 h przed jego początkiem — później napisz do trenera.
            </Text>
          )}
          {upcomingSessions!.slice(1, 3).map((next) => (
            <Text key={next.id} style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 6 }}>
              Potem:{" "}
              {new Date(next.scheduledAt).toLocaleString("pl-PL", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {next.location ? ` · ${next.location}` : ""}
            </Text>
          ))}
        </View>
      )}

      {pendingInvitations.length > 0 && (
        <View style={styles.invitationsSection}>
          <View style={styles.invitationsTitleRow}>
            <Ionicons name="mail" size={18} color={colors.primary} />
            <Text style={[styles.invitationsTitle, { color: colors.foreground }]}>
              Zaproszenia od trenerów ({pendingInvitations.length})
            </Text>
          </View>
          {pendingInvitations.map((inv) => {
            const trainerName = inv.trainer
              ? `${inv.trainer.firstName} ${inv.trainer.lastName}`.trim() || inv.trainer.email
              : "Trener";
            const isAccepting = acceptMutation.isPending && acceptMutation.variables === inv.id;
            const isRejecting = rejectMutation.isPending && rejectMutation.variables === inv.id;
            return (
              <View
                key={inv.id}
                style={[styles.invCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                testID={`card-invitation-${inv.id}`}
              >
                <View style={[styles.invIconWrap, { backgroundColor: colors.primary + "18" }]}>
                  <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
                </View>
                <View style={styles.invInfo}>
                  <Text style={[styles.invTrainerName, { color: colors.foreground }]}>
                    {trainerName}
                  </Text>
                  <Text style={[styles.invDesc, { color: colors.mutedForeground }]}>
                    zaprasza Cię jako podopiecznego
                  </Text>
                </View>
                <View style={styles.invActions}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Odrzuć zaproszenie"
                    onPress={() => confirmReject(inv.id, trainerName)}
                    disabled={isAccepting || isRejecting}
                    style={({ pressed }) => [
                      styles.rejectBtn,
                      { borderColor: colors.border, opacity: (isRejecting || pressed) ? 0.6 : 1 },
                    ]}
                    testID={`button-reject-invitation-${inv.id}`}
                  >
                    {isRejecting ? (
                      <ActivityIndicator size="small" color={colors.mutedForeground} />
                    ) : (
                      <Ionicons name="close" size={18} color={colors.mutedForeground} />
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => acceptMutation.mutate(inv.id)}
                    disabled={isAccepting || isRejecting}
                    style={({ pressed }) => [
                      styles.acceptBtn,
                      { backgroundColor: colors.primary, opacity: (isAccepting || pressed) ? 0.7 : 1 },
                    ]}
                    testID={`button-accept-invitation-${inv.id}`}
                  >
                    {isAccepting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.acceptBtnText}>Akceptuj</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={[styles.planCard, { backgroundColor: colors.primary }]}>
        <View style={styles.planTop}>
          <Ionicons name="barbell" size={22} color="rgba(255,255,255,0.8)" />
          <Text style={styles.planLabel}>Aktywny plan</Text>
        </View>
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : assignment?.plan ? (
          <>
            <Text style={styles.planName}>{assignment.plan.name}</Text>
            {assignment.plan.description && (
              <Text style={styles.planDesc}>{assignment.plan.description}</Text>
            )}
            {upNext && (
              <Pressable
                onPress={() => router.push("/(client)/training")}
                style={({ pressed }) => [styles.nextWorkout, { opacity: pressed ? 0.85 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel={`${upNext.trainedToday ? "Trenuj ponownie" : "Zacznij trening"}: ${upNext.workout.name}`}
                testID="button-start-next-workout"
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.nextWorkoutLabel}>{upNext.trainedToday ? "Następny w planie" : "Dziś w planie"}</Text>
                  <Text style={styles.nextWorkoutName} numberOfLines={1}>{upNext.workout.name}</Text>
                  {upNext.workout.exercises ? (
                    <Text style={styles.nextWorkoutMeta}>{upNext.workout.exercises.length} ćwiczeń</Text>
                  ) : null}
                </View>
                <View style={styles.nextWorkoutBtn}>
                  <Ionicons name="play" size={16} color={colors.primary} />
                  <Text style={[styles.nextWorkoutBtnText, { color: colors.primary }]}>Zacznij</Text>
                </View>
              </Pressable>
            )}
          </>
        ) : (
          <Text style={styles.planName}>Brak przypisanego planu</Text>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Szybki dostęp</Text>
      <View style={styles.quickGrid}>
        <QuickCard icon="barbell-outline" label="Trening" colors={colors} onPress={() => router.push("/(client)/training")} />
        <QuickCard icon="nutrition-outline" label="Dieta" colors={colors} onPress={() => router.push("/(client)/diet")} />
        <QuickCard icon="chatbubble-outline" label="Czat" colors={colors} onPress={() => router.push("/(client)/chat")} />
        <QuickCard icon="trending-up-outline" label="Postępy" colors={colors} onPress={() => router.push("/(client)/progress")} />
        <QuickCard icon="gift-outline" label="Polecenia" colors={colors} onPress={() => router.push("/(client)/referrals")} />
        <QuickCard icon="notifications-outline" label="Powiadomienia" colors={colors} onPress={() => router.push("/(client)/notifications")} />
        <QuickCard icon="document-text-outline" label="Raport tyg." colors={colors} onPress={() => router.push("/(client)/weekly-report")} />
        <QuickCard icon="person-outline" label="Profil" colors={colors} onPress={() => router.push("/(client)/profile")} />
      </View>
    </ScrollView>
  );
}

interface QuickCardProps {
  icon: IoniconsName;
  label: string;
  colors: Colors;
  onPress?: () => void;
}

function QuickCard({ icon, label, colors, onPress }: QuickCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={24} color={colors.primary} />
      <Text style={[styles.quickLabel, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: { fontSize: 14, fontFamily: "Inter_400Regular" },
  name: { fontSize: 22, fontFamily: "Inter_700Bold" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  sessionCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20 },
  sessionCardTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  sessionCardDate: { fontSize: 16, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
  invitationsSection: {
    marginBottom: 20,
    gap: 10,
  },
  invitationsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  invitationsTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  invCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  invIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  invInfo: {
    flex: 1,
    gap: 2,
  },
  invTrainerName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  invDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  invActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  acceptBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  acceptBtnText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  nextWorkout: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 14, padding: 12, marginTop: 14 },
  nextWorkoutLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: "Inter_500Medium" },
  nextWorkoutName: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 2 },
  nextWorkoutMeta: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  nextWorkoutBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  nextWorkoutBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  planCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 8,
  },
  planTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  planLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  planName: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
  planDesc: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  quickCard: {
    width: "47%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    alignItems: "flex-start",
  },
  quickLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
