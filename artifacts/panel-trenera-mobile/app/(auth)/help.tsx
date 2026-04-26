import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { useColors } from "@/hooks/useColors";

type FAQ = { q: string; a: string };

const FAQS: FAQ[] = [
  {
    q: "Jak dodać nowego klienta?",
    a: "W zakładce Klienci naciśnij przycisk „Zaproś klienta". Wpisz adres e-mail klienta — system wyśle mu e-mail z kodem zaproszenia. Klient rejestruje konto używając tego kodu, po czym automatycznie trafia do Twojej listy podopiecznych.",
  },
  {
    q: "Jak przypisać plan treningowy klientowi?",
    a: "Wejdź w profil klienta → zakładka Plany → „Nowy plan". Możesz stworzyć plan od zera lub skopiować istniejący. Plan staje się widoczny dla klienta od razu po zapisaniu.",
  },
  {
    q: "Jak działa subskrypcja i ile kosztuje?",
    a: "Panel Trenera oferuje plan darmowy (do 3 klientów) oraz plany płatne: Solo (99 zł/mies.), Pro (189 zł/mies.), Elite (279 zł/mies.), Max (349 zł/mies.) i Studio (wycena indywidualna). Zakup i zmiana planu odbywa się przez paneltrenera.pl/cennik.",
  },
  {
    q: "Klient nie może się zalogować — co zrobić?",
    a: "Sprawdź, czy zaproszenie zostało wysłane i czy klient użył właściwego adresu e-mail. Możesz anulować stare zaproszenie i wysłać nowe. Jeśli problem nadal występuje, skontaktuj się z supportem pod adresem support@paneltrenera.pl.",
  },
  {
    q: "Jak zmienić hasło?",
    a: "Hasło możesz zmienić przez opcję „Zapomniałem hasła" na ekranie logowania. Wpisz swój adres e-mail — wyślemy Ci link do ustawienia nowego hasła.",
  },
  {
    q: "Jak usunąć konto?",
    a: "Aby usunąć konto, skontaktuj się z nami pod adresem support@paneltrenera.pl z prośbą o usunięcie. Usuniemy Twoje konto i dane w ciągu 30 dni roboczych.",
  },
  {
    q: "Czy aplikacja działa offline?",
    a: "Podstawowy podgląd planów treningowych i diet jest dostępny po ostatnim zalogowaniu, jednak rejestrowanie sesji treningowych i synchronizacja danych wymaga połączenia z Internetem.",
  },
  {
    q: "Jak zgłosić błąd w aplikacji?",
    a: "Błędy możesz zgłaszać przez e-mail support@paneltrenera.pl. W wiadomości opisz dokładnie, co się stało, na jakim urządzeniu i w jakiej wersji aplikacji. Możesz też dołączyć zrzut ekranu.",
  },
  {
    q: "Jak klient może zobaczyć swoje postępy?",
    a: "Klient w swojej aplikacji ma zakładkę Postępy, gdzie widzi wykresy masy ciała, pomiarów i historię sesji treningowych. Zdjęcia postępu klient może dodawać samodzielnie.",
  },
  {
    q: "Czy mogę korzystać z Panelu Trenera na komputerze?",
    a: "Tak. Pełna wersja webowa jest dostępna pod adresem paneltrenera.pl. Oferuje te same funkcje co aplikacja mobilna, a w przyszłości również dodatkowe narzędzia dla trenerów.",
  },
];

export default function HelpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === "web" ? 16 : insets.top + 12,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="button-back-help">
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Pomoc i kontakt</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact cards */}
        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Skontaktuj się z nami</Text>
        <View style={styles.contactRow}>
          <ContactCard
            icon="mail-outline"
            title="E-mail support"
            subtitle="support@paneltrenera.pl"
            colors={colors}
            onPress={() => Linking.openURL("mailto:support@paneltrenera.pl")}
            testID="button-contact-email"
          />
          <ContactCard
            icon="globe-outline"
            title="Strona internetowa"
            subtitle="paneltrenera.pl"
            colors={colors}
            onPress={() => Linking.openURL("https://paneltrenera.pl")}
            testID="button-contact-web"
          />
        </View>
        <ContactCard
          icon="chatbubble-ellipses-outline"
          title="Chat na stronie"
          subtitle="Otwórz okno czatu na paneltrenera.pl — odpowiadamy w godzinach 9–17 (pon.–pt.)"
          colors={colors}
          onPress={() => Linking.openURL("https://paneltrenera.pl#chat")}
          testID="button-contact-chat"
          fullWidth
        />

        {/* FAQ */}
        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Najczęstsze pytania</Text>
        {FAQS.map((faq, i) => (
          <FAQItem
            key={i}
            faq={faq}
            index={i}
            expanded={expanded === i}
            onToggle={() => setExpanded(expanded === i ? null : i)}
            colors={colors}
          />
        ))}

        {/* Still need help */}
        <View style={[styles.stillNeedHelp, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="help-buoy-outline" size={28} color={colors.primary} />
          <Text style={[styles.stillNeedHelpTitle, { color: colors.foreground }]}>
            Nie znalazłeś odpowiedzi?
          </Text>
          <Text style={[styles.stillNeedHelpDesc, { color: colors.mutedForeground }]}>
            Nasz team chętnie pomoże. Napisz do nas — zazwyczaj odpowiadamy tego samego dnia.
          </Text>
          <Pressable
            onPress={() => Linking.openURL("mailto:support@paneltrenera.pl")}
            style={({ pressed }) => [
              styles.stillNeedHelpBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
            testID="button-contact-email-bottom"
          >
            <Ionicons name="mail-outline" size={16} color="#fff" />
            <Text style={styles.stillNeedHelpBtnText}>Napisz do nas</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function ContactCard({
  icon,
  title,
  subtitle,
  colors,
  onPress,
  testID,
  fullWidth,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
  testID?: string;
  fullWidth?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.contactCard,
        fullWidth && styles.contactCardFull,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={[styles.contactCardIcon, { backgroundColor: colors.primary + "15" }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.contactCardText}>
        <Text style={[styles.contactCardTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.contactCardSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

function FAQItem({
  faq,
  index,
  expanded,
  onToggle,
  colors,
}: {
  faq: FAQ;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onToggle}
      testID={`button-faq-${index}`}
      style={({ pressed }) => [
        styles.faqItem,
        {
          backgroundColor: expanded ? colors.primary + "08" : colors.card,
          borderColor: expanded ? colors.primary + "40" : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.faqHeader}>
        <Text style={[styles.faqQuestion, { color: colors.foreground, flex: 1 }]}>{faq.q}</Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.mutedForeground}
        />
      </View>
      {expanded && (
        <Text style={[styles.faqAnswer, { color: colors.mutedForeground }]}>{faq.a}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  content: { paddingHorizontal: 16, paddingTop: 24, gap: 0 },
  sectionLabel: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
    marginTop: 4,
  },
  contactRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  contactCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  contactCardFull: { flex: 0, flexDirection: "row" },
  contactCardIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  contactCardText: { flex: 1, gap: 2 },
  contactCardTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  contactCardSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  faqItem: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  faqQuestion: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  faqAnswer: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    marginTop: 10,
  },
  stillNeedHelp: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  stillNeedHelpTitle: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "center" },
  stillNeedHelpDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  stillNeedHelpBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 6,
  },
  stillNeedHelpBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
