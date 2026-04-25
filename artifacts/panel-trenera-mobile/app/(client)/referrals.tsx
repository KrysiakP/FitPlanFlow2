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
import * as Clipboard from "expo-clipboard";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiGet } from "@/lib/api";

type IoniconsName = ComponentProps<typeof Ionicons>["name"];

interface ReferralCode {
  id: string;
  code: string;
  lastUsedAt?: string | null;
}

interface ReferralStats {
  totalReferrals: number;
  qualifiedReferrals: number;
  pendingReferrals: number;
  totalBonusDaysEarned: number;
}

interface ReferralEvent {
  id: string;
  referredRole: string;
  status: string;
  createdAt: string;
  referredUser: {
    firstName: string;
    lastName: string;
    email: string;
  };
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

function StatusBadge({ status, colors }: { status: string; colors: Colors }) {
  const cfg: Record<string, { bg: string; fg: string; label: string }> = {
    qualified: { bg: "#16a34a18", fg: "#16a34a", label: "Zakwalifikowany" },
    pending: { bg: "#d9770618", fg: "#d97706", label: "Oczekujący" },
    bonus_granted: { bg: colors.primary + "18", fg: colors.primary, label: "Bonus przyznany" },
  };
  const c = cfg[status] ?? { bg: colors.border, fg: colors.mutedForeground, label: status };
  return (
    <View style={[badgeStyles.badge, { backgroundColor: c.bg }]}>
      <Text style={[badgeStyles.text, { color: c.fg }]}>{c.label}</Text>
    </View>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: IoniconsName;
  iconColor: string;
  colors: Colors;
}

function StatCard({ label, value, icon, iconColor, colors }: StatCardProps) {
  return (
    <View style={[statStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[statStyles.icon, { backgroundColor: iconColor + "18" }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[statStyles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[statStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function ClientReferralsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const { data: referralCode, isLoading: loadingCode, isError: errorCode, refetch: refetchCode, isRefetching: refetchingCode } = useQuery<ReferralCode | null>({
    queryKey: ["referrals-my-code"],
    queryFn: () => apiGet<ReferralCode | null>("/api/referrals/my-code"),
    enabled: !!user?.id,
    retry: 1,
  });

  const { data: stats, isLoading: loadingStats, refetch: refetchStats, isRefetching: refetchingStats } = useQuery<ReferralStats>({
    queryKey: ["referrals-my-stats"],
    queryFn: () => apiGet<ReferralStats>("/api/referrals/my-stats"),
    enabled: !!user?.id,
    retry: 1,
  });

  const { data: referrals, isLoading: loadingReferrals, refetch: refetchReferrals, isRefetching: refetchingReferrals } = useQuery<ReferralEvent[]>({
    queryKey: ["referrals-my-referrals"],
    queryFn: () => apiGet<ReferralEvent[]>("/api/referrals/my-referrals"),
    enabled: !!user?.id,
    retry: 1,
  });

  const isRefetching = refetchingCode || refetchingStats || refetchingReferrals;

  async function handleRefetch() {
    await Promise.all([refetchCode(), refetchStats(), refetchReferrals()]);
  }

  async function copyCode() {
    if (!referralCode?.code) return;
    await Clipboard.setStringAsync(referralCode.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  async function copyUrl() {
    if (!referralCode?.code) return;
    const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "paneltrenera.pl";
    const url = `https://${domain}/register?ref=${referralCode.code}`;
    await Clipboard.setStringAsync(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }

  const isLoading = loadingCode || loadingStats || loadingReferrals;
  const hasError = errorCode;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 90 }]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefetch} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Program poleceń</Text>
      <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>
        Poleć Panel Trenera i zdobywaj darmowe dni subskrypcji
      </Text>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : hasError ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="cloud-offline-outline" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Błąd ładowania</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Pociągnij w dół, aby spróbować ponownie.
          </Text>
        </View>
      ) : (
        <>
          <View style={[styles.codeCard, { backgroundColor: colors.card, borderColor: colors.border }]} testID="card-referral-code">
            <View style={styles.codeCardHeader}>
              <View style={[styles.codeIcon, { backgroundColor: colors.primary + "18" }]}>
                <Ionicons name="person-add-outline" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.codeCardTitle, { color: colors.foreground }]}>Twój kod polecający</Text>
                <Text style={[styles.codeCardDesc, { color: colors.mutedForeground }]}>
                  Udostępnij znajomym i zgarniaj darmowe dni
                </Text>
              </View>
            </View>

            {referralCode ? (
              <>
                <View style={[styles.codeBox, { backgroundColor: colors.primary + "0f" }]}>
                  <Text style={[styles.codeValue, { color: colors.primary }]} testID="text-referral-code">
                    {referralCode.code}
                  </Text>
                  <Pressable
                    onPress={copyCode}
                    style={({ pressed }) => [styles.copyBtn, { backgroundColor: colors.primary + "18", opacity: pressed ? 0.7 : 1 }]}
                    testID="button-copy-code"
                  >
                    <Ionicons name={copiedCode ? "checkmark" : "copy-outline"} size={18} color={colors.primary} />
                    <Text style={[styles.copyBtnText, { color: colors.primary }]}>
                      {copiedCode ? "Skopiowano!" : "Kopiuj"}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.urlRow}>
                  <Text style={[styles.urlLabel, { color: colors.mutedForeground }]}>Link rejestracyjny:</Text>
                  <Pressable
                    onPress={copyUrl}
                    style={({ pressed }) => [styles.copyUrlBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                    testID="button-copy-url"
                  >
                    <Ionicons name={copiedUrl ? "checkmark" : "link-outline"} size={16} color={colors.primary} />
                    <Text style={[styles.copyUrlText, { color: colors.primary }]}>
                      {copiedUrl ? "Skopiowano!" : "Kopiuj link"}
                    </Text>
                  </Pressable>
                </View>

                {referralCode.lastUsedAt && (
                  <Text style={[styles.lastUsed, { color: colors.mutedForeground }]} testID="text-last-used">
                    Ostatnio użyty: {formatDate(referralCode.lastUsedAt)}
                  </Text>
                )}
              </>
            ) : (
              <Text style={[styles.noCode, { color: colors.mutedForeground }]}>
                Nie znaleziono kodu polecającego.
              </Text>
            )}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Statystyki</Text>
          <View style={styles.statsGrid}>
            <StatCard
              label="Wszystkie"
              value={stats?.totalReferrals ?? 0}
              icon="people-outline"
              iconColor={colors.primary}
              colors={colors}
            />
            <StatCard
              label="Zakwalifik."
              value={stats?.qualifiedReferrals ?? 0}
              icon="checkmark-circle-outline"
              iconColor="#16a34a"
              colors={colors}
            />
            <StatCard
              label="Oczekujące"
              value={stats?.pendingReferrals ?? 0}
              icon="time-outline"
              iconColor="#d97706"
              colors={colors}
            />
            <StatCard
              label="Dni bonusowe"
              value={stats?.totalBonusDaysEarned ?? 0}
              icon="gift-outline"
              iconColor="#7c3aed"
              colors={colors}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Historia poleceń</Text>

          {!referrals || referrals.length === 0 ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="people-outline" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Brak poleceń</Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                Udostępnij swój kod polecający, aby zacząć zarabiać darmowe dni subskrypcji.
              </Text>
            </View>
          ) : (
            referrals.map((ref) => (
              <View
                key={ref.id}
                style={[styles.refCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                testID={`card-referral-${ref.id}`}
              >
                <View style={styles.refHeader}>
                  <View style={[styles.refAvatar, { backgroundColor: colors.primary + "18" }]}>
                    <Text style={[styles.refAvatarText, { color: colors.primary }]}>
                      {(ref.referredUser.firstName?.[0] ?? "") + (ref.referredUser.lastName?.[0] ?? "")}
                    </Text>
                  </View>
                  <View style={styles.refInfo}>
                    <Text style={[styles.refName, { color: colors.foreground }]} testID={`text-referral-name-${ref.id}`}>
                      {ref.referredUser.firstName} {ref.referredUser.lastName}
                    </Text>
                    <Text style={[styles.refEmail, { color: colors.mutedForeground }]} testID={`text-referral-email-${ref.id}`}>
                      {ref.referredUser.email}
                    </Text>
                    <Text style={[styles.refDate, { color: colors.mutedForeground }]} testID={`text-referral-date-${ref.id}`}>
                      {formatDate(ref.createdAt)}
                    </Text>
                  </View>
                </View>
                <StatusBadge status={ref.status} colors={colors} />
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const badgeStyles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  text: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});

const statStyles = StyleSheet.create({
  card: {
    width: "47%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
    alignItems: "center",
  },
  icon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  value: { fontSize: 24, fontFamily: "Inter_700Bold" },
  label: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 4 },
  pageSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 20, lineHeight: 20 },
  loader: { marginTop: 40 },
  codeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    marginBottom: 24,
  },
  codeCardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  codeIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  codeCardTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  codeCardDesc: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 18 },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    padding: 16,
  },
  codeValue: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  copyBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  urlRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  urlLabel: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  copyUrlBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  copyUrlText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  lastUsed: { fontSize: 12, fontFamily: "Inter_400Regular" },
  noCode: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 8 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 12 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  refCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    gap: 12,
  },
  refHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  refAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  refAvatarText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  refInfo: { flex: 1, gap: 2 },
  refName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  refEmail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  refDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
