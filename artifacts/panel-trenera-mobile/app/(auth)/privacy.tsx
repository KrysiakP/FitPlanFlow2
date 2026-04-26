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
import { useColors } from "@/hooks/useColors";

const LAST_UPDATED = "1 maja 2025 r.";
const APP_NAME = "Panel Trenera";
const COMPANY = "Panel Trenera";
const CONTACT_EMAIL = "rodo@paneltrenera.pl";

export default function PrivacyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

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
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="button-back-privacy">
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Prywatność i RODO</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.lastUpdated, { color: colors.mutedForeground }]}>
          Ostatnia aktualizacja: {LAST_UPDATED}
        </Text>

        <Section title="1. Administrator danych osobowych" colors={colors}>
          <Paragraph colors={colors}>
            Administratorem Twoich danych osobowych jest {COMPANY} (dalej: „Administrator"), operator aplikacji mobilnej {APP_NAME}.
          </Paragraph>
          <Paragraph colors={colors}>
            W sprawach związanych z ochroną danych osobowych możesz skontaktować się z nami pod adresem e-mail:{" "}
            <Text
              style={{ color: colors.primary, fontFamily: "Inter_500Medium" }}
              onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
            >
              {CONTACT_EMAIL}
            </Text>
          </Paragraph>
        </Section>

        <Section title="2. Jakie dane zbieramy" colors={colors}>
          <Paragraph colors={colors}>
            W ramach korzystania z Aplikacji przetwarzamy następujące kategorie danych:
          </Paragraph>
          <BulletList
            items={[
              "Dane rejestracyjne: imię, nazwisko, adres e-mail, hasło (w postaci zaszyfrowanej)",
              "Dane profilowe: zdjęcie profilowe (opcjonalnie), numer telefonu (opcjonalnie)",
              "Dane treningowe: plany treningowe, wyniki ćwiczeń, sesje treningowe, pomiary ciała",
              "Dane żywieniowe: plany dietetyczne, cele kaloryczne i makroskładnikowe",
              "Dane postępu: pomiary, fotografie postępu (opcjonalnie), raporty tygodniowe",
              "Dane płatności: historia transakcji (kwoty, daty) — numery kart obsługuje wyłącznie Stripe",
              "Dane techniczne: adres IP przy rejestracji (na potrzeby bezpieczeństwa), tokeny powiadomień push",
            ]}
            colors={colors}
          />
        </Section>

        <Section title="3. Cel i podstawa prawna przetwarzania" colors={colors}>
          <Paragraph colors={colors}>
            Twoje dane przetwarzamy w następujących celach:
          </Paragraph>
          <BulletList
            items={[
              "Świadczenie usług Aplikacji (art. 6 ust. 1 lit. b RODO — wykonanie umowy)",
              "Zarządzanie kontem i uwierzytelnianie (art. 6 ust. 1 lit. b RODO)",
              "Obsługa płatności za subskrypcję (art. 6 ust. 1 lit. b RODO)",
              "Wysyłanie powiadomień push (art. 6 ust. 1 lit. a RODO — zgoda)",
              "Bezpieczeństwo systemu i zapobieganie nadużyciom (art. 6 ust. 1 lit. f RODO — prawnie uzasadniony interes)",
              "Wypełnienie obowiązków prawnych, w tym podatkowych (art. 6 ust. 1 lit. c RODO)",
            ]}
            colors={colors}
          />
        </Section>

        <Section title="4. Okres przechowywania danych" colors={colors}>
          <Paragraph colors={colors}>
            Przechowujemy Twoje dane przez okres niezbędny do realizacji celów, dla których zostały zebrane:
          </Paragraph>
          <BulletList
            items={[
              "Dane konta — przez czas trwania konta, a po jego usunięciu do 30 dni (kopia zapasowa)",
              "Dane treningowe i dietetyczne — do usunięcia konta lub na Twoje żądanie",
              "Dane transakcyjne — przez 5 lat (obowiązek podatkowy)",
              "Logi bezpieczeństwa (adresy IP) — przez 12 miesięcy",
            ]}
            colors={colors}
          />
        </Section>

        <Section title="5. Odbiorcy danych" colors={colors}>
          <Paragraph colors={colors}>
            Twoje dane możemy przekazywać zaufanym podmiotom trzecim wyłącznie w zakresie niezbędnym do świadczenia usług:
          </Paragraph>
          <BulletList
            items={[
              "Stripe Inc. — obsługa płatności (polityka prywatności: stripe.com/privacy)",
              "Dostawca infrastruktury serwerowej — hosting i przechowywanie danych",
              "Dostawca usług e-mail — wysyłka powiadomień i wiadomości transakcyjnych",
              "Dostawca powiadomień push (Expo / Firebase) — dostarczanie powiadomień mobilnych",
            ]}
            colors={colors}
          />
          <Paragraph colors={colors}>
            Nie sprzedajemy ani nie udostępniamy Twoich danych osobowych stronom trzecim w celach marketingowych.
          </Paragraph>
        </Section>

        <Section title="6. Twoje prawa" colors={colors}>
          <Paragraph colors={colors}>
            Na podstawie RODO przysługują Ci następujące prawa:
          </Paragraph>
          <BulletList
            items={[
              "Prawo dostępu — możesz zażądać kopii swoich danych",
              "Prawo do sprostowania — możesz poprawić nieprawidłowe lub niekompletne dane",
              "Prawo do usunięcia — możesz żądać usunięcia danych (\"prawo do bycia zapomnianym\")",
              "Prawo do ograniczenia przetwarzania — możesz żądać ograniczenia przetwarzania swoich danych",
              "Prawo do przenoszenia danych — możesz otrzymać swoje dane w formacie nadającym się do odczytu maszynowego",
              "Prawo sprzeciwu — możesz sprzeciwić się przetwarzaniu na podstawie prawnie uzasadnionego interesu",
              "Prawo cofnięcia zgody — jeśli przetwarzanie odbywa się na podstawie zgody, możesz ją cofnąć w dowolnym momencie",
            ]}
            colors={colors}
          />
          <Paragraph colors={colors}>
            Aby skorzystać z powyższych praw, skontaktuj się z nami pod adresem{" "}
            <Text
              style={{ color: colors.primary, fontFamily: "Inter_500Medium" }}
              onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
            >
              {CONTACT_EMAIL}
            </Text>
            . Odpowiemy na Twoje żądanie w ciągu 30 dni.
          </Paragraph>
        </Section>

        <Section title="7. Prawo do wniesienia skargi" colors={colors}>
          <Paragraph colors={colors}>
            Jeśli uważasz, że przetwarzamy Twoje dane niezgodnie z prawem, masz prawo wniesienia skargi do organu nadzorczego — Prezesa Urzędu Ochrony Danych Osobowych (UODO), ul. Stawki 2, 00-193 Warszawa, uodo.gov.pl.
          </Paragraph>
        </Section>

        <Section title="8. Pliki cookie i technologie śledzące" colors={colors}>
          <Paragraph colors={colors}>
            Aplikacja mobilna używa sesyjnych plików cookie wyłącznie w celu uwierzytelnienia i utrzymania zalogowanej sesji użytkownika. Nie używamy cookies reklamowych ani śledzących.
          </Paragraph>
          <Paragraph colors={colors}>
            Wersja webowa Aplikacji może używać niezbędnych technicznie plików cookie. Nie prowadzimy remarketingu ani profilowania reklamowego.
          </Paragraph>
        </Section>

        <Section title="9. Bezpieczeństwo danych" colors={colors}>
          <Paragraph colors={colors}>
            Stosujemy odpowiednie środki techniczne i organizacyjne chroniące Twoje dane przed nieuprawnionym dostępem:
          </Paragraph>
          <BulletList
            items={[
              "Szyfrowanie transmisji danych (HTTPS/TLS)",
              "Przechowywanie haseł wyłącznie w postaci zaszyfrowanej (bcrypt)",
              "Uwierzytelnianie sesji z automatycznym wygaśnięciem",
              "Ograniczony dostęp personelu do danych produkcyjnych",
            ]}
            colors={colors}
          />
        </Section>

        <Section title="10. Zmiany polityki prywatności" colors={colors}>
          <Paragraph colors={colors}>
            Zastrzegamy sobie prawo do aktualizacji niniejszej Polityki Prywatności. O istotnych zmianach poinformujemy Cię przez powiadomienie w Aplikacji lub wiadomość e-mail, co najmniej 14 dni przed wejściem zmian w życie.
          </Paragraph>
        </Section>

        <Section title="11. Kontakt" colors={colors}>
          <Paragraph colors={colors}>
            W przypadku pytań dotyczących ochrony danych osobowych skontaktuj się z nami:
          </Paragraph>
          <BulletList
            items={[
              `E-mail: ${CONTACT_EMAIL}`,
              "Strona: paneltrenera.pl",
            ]}
            colors={colors}
          />
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={sectionStyles.wrap}>
      <Text style={[sectionStyles.title, { color: colors.foreground }]}>{title}</Text>
      <View style={sectionStyles.body}>{children}</View>
    </View>
  );
}

function Paragraph({
  children,
  colors,
}: {
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return <Text style={[paraStyles.text, { color: colors.foreground }]}>{children}</Text>;
}

function BulletList({
  items,
  colors,
}: {
  items: string[];
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={bulletStyles.wrap}>
      {items.map((item, i) => (
        <View key={i} style={bulletStyles.row}>
          <Text style={[bulletStyles.dot, { color: colors.mutedForeground }]}>{"\u2022"}</Text>
          <Text style={[bulletStyles.text, { color: colors.foreground }]}>{item}</Text>
        </View>
      ))}
    </View>
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
  content: { paddingHorizontal: 20, paddingTop: 20 },
  lastUpdated: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
    textAlign: "center",
  },
});

const sectionStyles = StyleSheet.create({
  wrap: { marginBottom: 24 },
  title: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 10 },
  body: { gap: 8 },
});

const paraStyles = StyleSheet.create({
  text: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
});

const bulletStyles = StyleSheet.create({
  wrap: { gap: 4, paddingLeft: 4 },
  row: { flexDirection: "row", gap: 8 },
  dot: { fontSize: 14, lineHeight: 22, width: 12 },
  text: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
});
