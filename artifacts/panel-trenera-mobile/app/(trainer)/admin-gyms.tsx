import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

type GymRow = {
  id: string;
  name: string;
  planTier: string;
  maxTrainers: number;
  trainerCount: number;
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
  ownerEmail: string | null;
  ownerFirstName: string | null;
  ownerLastName: string | null;
};

type CreateGymForm = {
  gymName: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerPassword: string;
  planTier: "starter" | "pro" | "enterprise";
  maxTrainers: string;
  contactEmail: string;
  phone: string;
  address: string;
};

const TIER_LABELS: Record<string, { label: string; color: string; maxDefault: number }> = {
  starter: { label: "Starter", color: "#6366f1", maxDefault: 5 },
  pro: { label: "Pro", color: "#0846ab", maxDefault: 15 },
  enterprise: { label: "Enterprise", color: "#f59e0b", maxDefault: 50 },
};

const EMPTY_FORM: CreateGymForm = {
  gymName: "",
  ownerEmail: "",
  ownerFirstName: "",
  ownerLastName: "",
  ownerPassword: "",
  planTier: "starter",
  maxTrainers: "5",
  contactEmail: "",
  phone: "",
  address: "",
};

export default function AdminGymsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<CreateGymForm>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: gyms = [], isLoading, refetch, isRefetching } = useQuery<GymRow[]>({
    queryKey: ["admin-gyms"],
    queryFn: () => apiGet("/api/admin/gyms"),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/admin/gyms", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-gyms"] });
      setModal(false);
      setForm(EMPTY_FORM);
    },
    onError: (e: any) => Alert.alert("Błąd", e?.message ?? "Nie udało się utworzyć siłowni"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiPatch(`/api/admin/gyms/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-gyms"] });
      setModal(false);
      setEditId(null);
      setForm(EMPTY_FORM);
    },
    onError: (e: any) => Alert.alert("Błąd", e?.message ?? "Nie udało się zaktualizować"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/admin/gyms/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-gyms"] }),
    onError: (e: any) => Alert.alert("Błąd", e?.message ?? "Nie udało się usunąć siłowni"),
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setModal(true);
  }

  function openEdit(gym: GymRow) {
    setForm({
      gymName: gym.name,
      ownerEmail: gym.ownerEmail ?? "",
      ownerFirstName: gym.ownerFirstName ?? "",
      ownerLastName: gym.ownerLastName ?? "",
      ownerPassword: "",
      planTier: (gym.planTier as any) ?? "starter",
      maxTrainers: String(gym.maxTrainers),
      contactEmail: gym.contactEmail ?? "",
      phone: gym.phone ?? "",
      address: gym.address ?? "",
    });
    setEditId(gym.id);
    setModal(true);
  }

  function handleDelete(gym: GymRow) {
    Alert.alert(
      "Usuń siłownię",
      `Czy na pewno chcesz usunąć siłownię "${gym.name}"? Tej operacji nie można cofnąć.`,
      [
        { text: "Anuluj", style: "cancel" },
        { text: "Usuń", style: "destructive", onPress: () => deleteMutation.mutate(gym.id) },
      ]
    );
  }

  function handleSubmit() {
    if (!form.gymName.trim()) return Alert.alert("Błąd", "Podaj nazwę siłowni");
    if (!editId) {
      if (!form.ownerEmail.trim() || !form.ownerPassword.trim())
        return Alert.alert("Błąd", "Podaj e-mail i hasło właściciela");
      createMutation.mutate({
        gymName: form.gymName.trim(),
        ownerEmail: form.ownerEmail.trim().toLowerCase(),
        ownerFirstName: form.ownerFirstName.trim() || "Właściciel",
        ownerLastName: form.ownerLastName.trim() || "Siłowni",
        ownerPassword: form.ownerPassword,
        planTier: form.planTier,
        maxTrainers: parseInt(form.maxTrainers) || 5,
        contactEmail: form.contactEmail.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
      });
    } else {
      updateMutation.mutate({
        id: editId,
        data: {
          name: form.gymName.trim(),
          planTier: form.planTier,
          maxTrainers: parseInt(form.maxTrainers) || 5,
          contactEmail: form.contactEmail.trim() || undefined,
          phone: form.phone.trim() || undefined,
          address: form.address.trim() || undefined,
        },
      });
    }
  }

  function set(key: keyof CreateGymForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.adminBanner, { backgroundColor: "#fef3c718", borderColor: "#f59e0b40" }]}>
          <Ionicons name="shield-checkmark" size={20} color="#f59e0b" />
          <Text style={[styles.adminBannerText, { color: "#b45309" }]}>
            Panel administratora — Siłownie
          </Text>
        </View>

        <Pressable
          onPress={openCreate}
          style={({ pressed }) => [styles.createBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          testID="button-create-gym"
        >
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={styles.createBtnText}>Utwórz nową siłownię</Text>
        </Pressable>

        <Text style={[styles.countText, { color: colors.mutedForeground }]}>
          {gyms.length} {gyms.length === 1 ? "siłownia" : gyms.length < 5 ? "siłownie" : "siłowni"} w systemie
        </Text>

        {gyms.length === 0 ? (
          <View style={[styles.emptyState, { borderColor: colors.border }]}>
            <Ionicons name="business-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Brak siłowni</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              Utwórz pierwszą siłownię, aby przypisać jej trenerów.
            </Text>
          </View>
        ) : (
          gyms.map((gym) => {
            const tier = TIER_LABELS[gym.planTier] ?? TIER_LABELS.starter;
            return (
              <View
                key={gym.id}
                style={[styles.gymCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                testID={`card-gym-${gym.id}`}
              >
                <View style={styles.gymCardHeader}>
                  <View style={[styles.gymIcon, { backgroundColor: tier.color + "18" }]}>
                    <Ionicons name="barbell-outline" size={20} color={tier.color} />
                  </View>
                  <View style={styles.gymInfo}>
                    <Text style={[styles.gymName, { color: colors.foreground }]}>{gym.name}</Text>
                    <Text style={[styles.gymOwner, { color: colors.mutedForeground }]}>
                      {gym.ownerFirstName} {gym.ownerLastName} · {gym.ownerEmail}
                    </Text>
                  </View>
                  <View style={[styles.tierBadge, { backgroundColor: tier.color + "18" }]}>
                    <Text style={[styles.tierBadgeText, { color: tier.color }]}>{tier.label}</Text>
                  </View>
                </View>

                <View style={[styles.gymStats, { borderTopColor: colors.border }]}>
                  <StatChip icon="people-outline" value={`${gym.trainerCount}/${gym.maxTrainers}`} label="trenerów" color={tier.color} />
                  {gym.contactEmail && <StatChip icon="mail-outline" value={gym.contactEmail} label="" color={colors.mutedForeground} />}
                  <Text style={[styles.createdAt, { color: colors.mutedForeground }]}>
                    {new Date(gym.createdAt).toLocaleDateString("pl-PL")}
                  </Text>
                </View>

                <View style={styles.gymActions}>
                  <Pressable
                    onPress={() => openEdit(gym)}
                    style={({ pressed }) => [styles.actionBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                    testID={`button-edit-gym-${gym.id}`}
                  >
                    <Ionicons name="pencil-outline" size={16} color={colors.foreground} />
                    <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Edytuj</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDelete(gym)}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      { borderColor: colors.destructive + "40", backgroundColor: colors.destructive + "08", opacity: pressed ? 0.7 : 1 },
                    ]}
                    testID={`button-delete-gym-${gym.id}`}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                    <Text style={[styles.actionBtnText, { color: colors.destructive }]}>Usuń</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalOverlay}>
          <ScrollView
            style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}
            contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editId ? "Edytuj siłownię" : "Nowa siłownia"}
              </Text>
              <Pressable onPress={() => setModal(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </Pressable>
            </View>

            <FieldLabel colors={colors}>Nazwa siłowni *</FieldLabel>
            <Input value={form.gymName} onChange={(v) => set("gymName", v)} placeholder="np. Olimp Gym Kraków" colors={colors} testID="input-gym-name" />

            {!editId && (
              <>
                <FieldLabel colors={colors}>E-mail właściciela *</FieldLabel>
                <Input value={form.ownerEmail} onChange={(v) => set("ownerEmail", v)} placeholder="owner@silownia.pl" keyboardType="email-address" autoCapitalize="none" colors={colors} testID="input-owner-email" />

                <View style={styles.row2}>
                  <View style={{ flex: 1 }}>
                    <FieldLabel colors={colors}>Imię</FieldLabel>
                    <Input value={form.ownerFirstName} onChange={(v) => set("ownerFirstName", v)} placeholder="Jan" colors={colors} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FieldLabel colors={colors}>Nazwisko</FieldLabel>
                    <Input value={form.ownerLastName} onChange={(v) => set("ownerLastName", v)} placeholder="Kowalski" colors={colors} />
                  </View>
                </View>

                <FieldLabel colors={colors}>Hasło właściciela *</FieldLabel>
                <Input value={form.ownerPassword} onChange={(v) => set("ownerPassword", v)} placeholder="min. 6 znaków" secureTextEntry colors={colors} testID="input-owner-password" />
              </>
            )}

            <FieldLabel colors={colors}>Plan pakietu</FieldLabel>
            <View style={styles.planRow}>
              {(["starter", "pro", "enterprise"] as const).map((p) => {
                const t = TIER_LABELS[p];
                return (
                  <Pressable
                    key={p}
                    onPress={() => { set("planTier", p); set("maxTrainers", String(t.maxDefault)); }}
                    style={[
                      styles.planOption,
                      { borderColor: form.planTier === p ? t.color : colors.border, backgroundColor: form.planTier === p ? t.color + "12" : colors.background },
                    ]}
                  >
                    <Text style={[styles.planOptionText, { color: form.planTier === p ? t.color : colors.foreground }]}>{t.label}</Text>
                    <Text style={[styles.planOptionSub, { color: colors.mutedForeground }]}>{t.maxDefault} trenerów</Text>
                  </Pressable>
                );
              })}
            </View>

            <FieldLabel colors={colors}>Limit trenerów</FieldLabel>
            <Input value={form.maxTrainers} onChange={(v) => set("maxTrainers", v)} placeholder="5" keyboardType="numeric" colors={colors} />

            <FieldLabel colors={colors}>E-mail kontaktowy</FieldLabel>
            <Input value={form.contactEmail} onChange={(v) => set("contactEmail", v)} placeholder="kontakt@silownia.pl" keyboardType="email-address" autoCapitalize="none" colors={colors} />

            <FieldLabel colors={colors}>Telefon</FieldLabel>
            <Input value={form.phone} onChange={(v) => set("phone", v)} placeholder="+48 123 456 789" keyboardType="phone-pad" colors={colors} />

            <FieldLabel colors={colors}>Adres</FieldLabel>
            <Input value={form.address} onChange={(v) => set("address", v)} placeholder="ul. Sportowa 1, 00-000 Warszawa" colors={colors} />

            <Pressable
              onPress={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: colors.primary, opacity: pressed || createMutation.isPending || updateMutation.isPending ? 0.7 : 1 },
              ]}
              testID="button-submit-gym"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>{editId ? "Zapisz zmiany" : "Utwórz siłownię"}</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function FieldLabel({ children, colors }: { children: React.ReactNode; colors: ReturnType<typeof useColors> }) {
  return <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{children}</Text>;
}

function Input({
  value, onChange, placeholder, keyboardType, autoCapitalize, secureTextEntry, colors, testID,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  secureTextEntry?: boolean;
  colors: ReturnType<typeof useColors>;
  testID?: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.mutedForeground}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize ?? "sentences"}
      secureTextEntry={secureTextEntry}
      style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
      testID={testID}
    />
  );
}

function StatChip({ icon, value, label, color }: { icon: React.ComponentProps<typeof Ionicons>["name"]; value: string; label: string; color: string }) {
  return (
    <View style={styles.statChip}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.statChipText, { color }]}>{value}{label ? ` ${label}` : ""}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16 },
  adminBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16 },
  adminBannerText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  createBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 14, marginBottom: 12 },
  createBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  countText: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 16 },
  emptyState: { alignItems: "center", gap: 10, paddingVertical: 48, borderWidth: 1, borderRadius: 16, borderStyle: "dashed", paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  gymCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  gymCardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  gymIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  gymInfo: { flex: 1 },
  gymName: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 2 },
  gymOwner: { fontSize: 12, fontFamily: "Inter_400Regular" },
  tierBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  tierBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  gymStats: { flexDirection: "row", flexWrap: "wrap", gap: 10, borderTopWidth: 1, paddingTop: 12, marginBottom: 12, alignItems: "center" },
  createdAt: { fontSize: 11, fontFamily: "Inter_400Regular", marginLeft: "auto" },
  statChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  statChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  gymActions: { flexDirection: "row", gap: 8 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderRadius: 10, padding: 10 },
  actionBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 4 },
  planRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  planOption: { flex: 1, borderWidth: 1.5, borderRadius: 10, padding: 10, alignItems: "center", gap: 2 },
  planOptionText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  planOptionSub: { fontSize: 10, fontFamily: "Inter_400Regular" },
  row2: { flexDirection: "row", gap: 10 },
  submitBtn: { marginTop: 20, padding: 14, borderRadius: 12, alignItems: "center" },
  submitBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
