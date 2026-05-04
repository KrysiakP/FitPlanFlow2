import type { ComponentProps } from "react";
import {
  ActivityIndicator,
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
import { apiGet, apiPost } from "@/lib/api";

type Colors = ReturnType<typeof useColors>;
type IoniconsName = ComponentProps<typeof Ionicons>["name"];

interface Assignment {
  plan?: {
    name: string;
    description?: string | null;
  } | null;
}

interface InvitationTrainer {
  firstName: string;
  lastName: string;
  email: string;
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

  const { data: invitations, refetch: refetchInvitations } = useQuery<PendingInvitation[]>({
    queryKey: ["client-invitations"],
    queryFn: () => apiGet<PendingInvitation[]>("/api/invitations"),
    enabled: !!user?.id,
    retry: 1,
  });

  const pendingInvitations = (invitations ?? []).filter((i) => i.status === "pending");

  const acceptMutation = useMutation({
    mutationFn: (id: string) => apiPost(`/api/invitations/${id}/accept`, {}),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["client-invitations"] });
      qc.invalidateQueries({ queryKey: ["client-assignment"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiPost(`/api/invitations/${id}/reject`, {}),
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      qc.invalidateQueries({ queryKey: ["client-invitations"] });
    },
  });

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
                  <Pressable
                    onPress={() => rejectMutation.mutate(inv.id)}
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
        <QuickCard icon="medical-outline" label="Badania" colors={colors} onPress={() => router.push("/(client)/medical-tests")} />
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
