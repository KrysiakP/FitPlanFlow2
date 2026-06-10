import type { ComponentProps } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useTheme, type ThemePreference } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";

const TIER_LABELS: Record<string, string> = {
  start: "Start (darmowy)",
  solo: "Solo",
  pro: "Pro",
  elite: "Elite",
  max: "Max",
  studio: "Studio",
};

interface PricingPlan {
  id: string;
  name: string;
  price: number | string;
  description: string;
  clientLimit: number;
  features: string[];
  highlighted?: boolean;
  customPricing?: boolean;
}

const PRICING_PLANS: PricingPlan[] = [
  {
    id: "start",
    name: "START",
    price: 0,
    description: "Idealny na start, wypróbuj za darmo",
    clientLimit: 3,
    features: [
      "Do 3 podopiecznych",
      "Plany treningowe",
      "Biblioteka ćwiczeń",
      "Raporty tygodniowe",
    ],
  },
  {
    id: "solo",
    name: "SOLO",
    price: 99,
    description: "Dla początkujących trenerów personalnych",
    clientLimit: 10,
    features: [
      "Do 10 podopiecznych",
      "Plany treningowe",
      "Biblioteka ćwiczeń",
      "Raporty tygodniowe",
      "Email wsparcie",
    ],
  },
  {
    id: "pro",
    name: "PRO",
    price: 189,
    description: "Dla rozwijających się trenerów",
    clientLimit: 20,
    highlighted: true,
    features: [
      "Do 20 podopiecznych",
      "Plany treningowe",
      "Biblioteka ćwiczeń",
      "Raporty tygodniowe",
      "Priorytetowe wsparcie",
      "Dedykowany opiekun",
    ],
  },
  {
    id: "elite",
    name: "ELITE",
    price: 279,
    description: "Dla profesjonalnych trenerów",
    clientLimit: 35,
    features: [
      "Do 35 podopiecznych",
      "Plany treningowe",
      "Biblioteka ćwiczeń",
      "Raporty tygodniowe",
      "Priorytetowe wsparcie",
      "Dedykowany opiekun",
    ],
  },
  {
    id: "max",
    name: "MAX",
    price: 349,
    description: "Dla ekspertów z dużą bazą klientów",
    clientLimit: 50,
    features: [
      "Do 50 podopiecznych",
      "Plany treningowe",
      "Biblioteka ćwiczeń",
      "Raporty tygodniowe",
      "Priorytetowe wsparcie",
      "Dedykowany opiekun",
    ],
  },
  {
    id: "studio",
    name: "STUDIO/KLUB",
    price: "Wycena",
    description: "Dla studiów i klubów fitness",
    clientLimit: -1,
    customPricing: true,
    features: [
      "Powyżej 50 podopiecznych",
      "Plany treningowe",
      "Biblioteka ćwiczeń",
      "Raporty tygodniowe",
      "Priorytetowe wsparcie",
      "Dedykowany opiekun",
    ],
  },
];

export default function TrainerProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const topPad = insets.top;
  const initials = ((user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")).toUpperCase();

  const tier = user?.subscriptionTier ?? "start";
  const tierLabel = TIER_LABELS[tier] ?? tier;
  const isActive = user?.subscriptionStatus === "active";

  async function handleLogout() {
    Alert.alert("Wylogowanie", "Czy na pewno chcesz się wylogować?", [
      { text: "Anuluj", style: "cancel" },
      {
        text: "Wyloguj",
        style: "destructive",
        onPress: async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.stickyHeader, { paddingTop: topPad + 8, backgroundColor: colors.background }]}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Profil</Text>
      </View>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90 }]}
      showsVerticalScrollIndicator={false}
    >

      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>{initials}</Text>
        </View>
        <Text style={[styles.name, { color: colors.foreground }]}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={[styles.email, { color: colors.mutedForeground }]}>{user?.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: colors.primary + "1a" }]}>
          <Ionicons name="barbell-outline" size={13} color={colors.primary} />
          <Text style={[styles.roleText, { color: colors.primary }]}>Trener</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Subskrypcja</Text>
      <View style={[styles.subscriptionCard, { backgroundColor: colors.primary }]}>
        <View style={styles.subHeader}>
          <View>
            <Text style={styles.subTier}>{tierLabel}</Text>
            <Text style={styles.subStatus}>
              {isActive ? "Aktywna" : user?.subscriptionStatus === "trialing" ? "Okres próbny" : "Nieaktywna"}
            </Text>
          </View>
          <View style={[styles.subBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Ionicons name="star" size={16} color="#fff" />
          </View>
        </View>
        <View style={[styles.subDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
        <Pressable
          onPress={() =>
            Linking.openURL(
              Platform.OS === "ios"
                ? "https://myfitplan.replit.app/pricing"
                : "https://paneltrenera.pl/cennik"
            )
          }
          style={({ pressed }) => [styles.subBtn, { opacity: pressed ? 0.8 : 1 }]}
          testID="button-manage-subscription"
        >
          <Ionicons name="globe-outline" size={16} color="#fff" />
          <Text style={styles.subBtnText}>
            {Platform.OS === "ios"
              ? "Zarządzaj subskrypcją na stronie"
              : "Zarządzaj subskrypcją na paneltrenera.pl"}
          </Text>
          <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </View>

      <>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Cennik planów</Text>
        <Text style={[styles.pricingNote, { color: colors.mutedForeground }]}>
          Zakup i zmiana planu odbywa się przez paneltrenera.pl
        </Text>
        {PRICING_PLANS.map((plan) => {
            const isCurrent = tier === plan.id;
            return (
              <View
                key={plan.id}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: isCurrent ? colors.primary + "0f" : colors.card,
                    borderColor: isCurrent ? colors.primary : colors.border,
                    borderWidth: isCurrent ? 2 : 1,
                  },
                ]}
                testID={`card-pricing-${plan.id}`}
              >
                <View style={styles.planCardHeader}>
                  <View style={styles.planCardLeft}>
                    <View style={styles.planNameRow}>
                      <Text style={[styles.planName, { color: isCurrent ? colors.primary : colors.foreground }]}>
                        {plan.name}
                      </Text>
                      {isCurrent && (
                        <View style={[styles.currentBadge, { backgroundColor: colors.primary }]}>
                          <Text style={styles.currentBadgeText}>Aktualny</Text>
                        </View>
                      )}
                      {plan.highlighted && !isCurrent && (
                        <View style={[styles.popularBadge, { backgroundColor: colors.primary + "18" }]}>
                          <Text style={[styles.popularBadgeText, { color: colors.primary }]}>Popularny</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.planDesc, { color: colors.mutedForeground }]}>{plan.description}</Text>
                  </View>
                  <View style={styles.planPriceBox}>
                    {plan.customPricing ? (
                      <Text style={[styles.planPriceCustom, { color: isCurrent ? colors.primary : colors.foreground }]}>
                        Wycena
                      </Text>
                    ) : (
                      <>
                        <Text style={[styles.planPrice, { color: isCurrent ? colors.primary : colors.foreground }]}>
                          {plan.price === 0 ? "0" : plan.price} zł
                        </Text>
                        <Text style={[styles.planPricePer, { color: colors.mutedForeground }]}>/mies.</Text>
                      </>
                    )}
                  </View>
                </View>

                <View style={[styles.planFeaturesList]}>
                  {plan.features.map((feature) => (
                    <View key={feature} style={styles.planFeatureRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={15}
                        color={isCurrent ? colors.primary : "#16a34a"}
                      />
                      <Text style={[styles.planFeatureText, { color: colors.mutedForeground }]}>
                        {feature}
                      </Text>
                    </View>
                  ))}
                </View>

                {!isCurrent && Platform.OS !== "ios" && (
                  <Pressable
                    onPress={() => Linking.openURL("https://paneltrenera.pl/cennik")}
                    style={({ pressed }) => [
                      styles.planCta,
                      {
                        backgroundColor: plan.highlighted ? colors.primary : "transparent",
                        borderColor: plan.highlighted ? colors.primary : colors.border,
                        borderWidth: 1,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                    testID={`button-select-plan-${plan.id}`}
                  >
                    <Text
                      style={[
                        styles.planCtaText,
                        { color: plan.highlighted ? "#fff" : colors.foreground },
                      ]}
                    >
                      {plan.customPricing ? "Skontaktuj się" : "Wybierz plan"}
                    </Text>
                    <Ionicons
                      name="open-outline"
                      size={14}
                      color={plan.highlighted ? "#fff" : colors.mutedForeground}
                    />
                  </Pressable>
                )}
              </View>
            );
        })}
      </>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ustawienia</Text>
      <ThemeToggleRow colors={colors} />
      <MenuRow
        icon="notifications-outline"
        label="Powiadomienia"
        desc="Zarządzaj powiadomieniami push"
        colors={colors}
        onPress={() => router.push("/notifications")}
        testID="button-notifications"
      />
      <MenuRow icon="shield-checkmark-outline" label="Prywatność i RODO" desc="Zarządzaj zgodami i danymi" colors={colors} onPress={() => router.push("/(auth)/privacy")} testID="button-privacy" />
      <MenuRow icon="help-circle-outline" label="Pomoc i kontakt" desc="FAQ i support techniczny" colors={colors} onPress={() => router.push("/(auth)/help")} testID="button-help" />

      <Pressable
        onPress={handleLogout}
        style={({ pressed }) => [
          styles.logoutBtn,
          { backgroundColor: colors.destructive + "18", borderColor: colors.destructive + "44", opacity: pressed ? 0.8 : 1 },
        ]}
        testID="button-logout"
      >
        <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
        <Text style={[styles.logoutText, { color: colors.destructive }]}>Wyloguj się</Text>
      </Pressable>

      <DeleteAccountButton />

      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        Panel Trenera v1.0{"\n"}paneltrenera.pl
      </Text>
    </ScrollView>
    </View>
  );
}

interface MenuRowProps {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  desc?: string;
  colors: ReturnType<typeof useColors>;
  onPress?: () => void;
  testID?: string;
}

function MenuRow({ icon, label, desc, colors, onPress, testID }: MenuRowProps) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.menuRow,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.menuIcon, { backgroundColor: colors.accent }]}>
        <Ionicons name={icon} size={18} color={colors.foreground} />
      </View>
      <View style={styles.menuInfo}>
        <Text style={[styles.menuLabel, { color: colors.foreground }]}>{label}</Text>
        {desc && <Text style={[styles.menuDesc, { color: colors.mutedForeground }]}>{desc}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

function ThemeToggleRow({ colors }: { colors: ReturnType<typeof useColors> }) {
  const { preference, setPreference } = useTheme();
  const options: { value: ThemePreference; icon: ComponentProps<typeof Ionicons>["name"]; label: string }[] = [
    { value: "light", icon: "sunny-outline", label: "Jasny" },
    { value: "system", icon: "phone-portrait-outline", label: "System" },
    { value: "dark", icon: "moon-outline", label: "Ciemny" },
  ];

  return (
    <View style={[styles.menuRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.menuIcon, { backgroundColor: colors.accent }]}>
        <Ionicons name="contrast-outline" size={18} color={colors.foreground} />
      </View>
      <View style={[styles.menuInfo, { flex: 1 }]}>
        <Text style={[styles.menuLabel, { color: colors.foreground }]}>Motyw</Text>
      </View>
      <View style={[styles.themeToggleRow, { backgroundColor: colors.accent, borderColor: colors.border }]}>
        {options.map((opt) => {
          const active = preference === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => { setPreference(opt.value); Haptics.selectionAsync(); }}
              style={[
                styles.themeOption,
                active && { backgroundColor: colors.primary },
              ]}
              testID={`button-theme-${opt.value}`}
            >
              <Ionicons name={opt.icon} size={14} color={active ? colors.primaryForeground : colors.mutedForeground} />
              <Text style={[styles.themeOptionLabel, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20 },
  stickyHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 8 },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  profileCard: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", gap: 8, marginBottom: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 28, fontFamily: "Inter_700Bold" },
  name: { fontSize: 20, fontFamily: "Inter_700Bold" },
  email: { fontSize: 13, fontFamily: "Inter_400Regular" },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 4 },
  roleText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 10 },
  subscriptionCard: { borderRadius: 16, padding: 20, marginBottom: 24, gap: 16 },
  subHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  subTier: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
  subStatus: { color: "rgba(255,255,255,0.75)", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  subBadge: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  subDivider: { height: 1 },
  subBtn: { flexDirection: "row", alignItems: "center", gap: 8 },
  subBtnText: { flex: 1, color: "#fff", fontSize: 14, fontFamily: "Inter_500Medium" },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  menuDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 14, borderWidth: 1, marginTop: 8, marginBottom: 16 },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  footer: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  pricingNote: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -4, marginBottom: 14, lineHeight: 18 },
  planCard: { borderRadius: 16, padding: 18, marginBottom: 12 },
  planCardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 },
  planCardLeft: { flex: 1, gap: 4 },
  planNameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  planName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  currentBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  currentBadgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  popularBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  popularBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  planDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  planPriceBox: { alignItems: "flex-end", gap: 1 },
  planPrice: { fontSize: 22, fontFamily: "Inter_700Bold" },
  planPricePer: { fontSize: 11, fontFamily: "Inter_400Regular" },
  planPriceCustom: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  planFeaturesList: { gap: 6, marginBottom: 14 },
  planFeatureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  planFeatureText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  planCta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11, borderRadius: 12 },
  planCtaText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  themeToggleRow: { flexDirection: "row", borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  themeOption: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 7 },
  themeOptionLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
