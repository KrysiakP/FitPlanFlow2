/**
 * Push notifications a user may switch off. Everything else (new plan, booked or cancelled session, ...)
 * is transactional and always delivered. The list depends on the role, so the app can render it as it comes.
 */

export type PreferenceRole = "client" | "trainer" | "gym_owner";

export interface OptionalNotification {
  type: string;
  label: string;
  description: string;
}

const OPTIONS: Record<PreferenceRole, OptionalNotification[]> = {
  client: [
    { type: "session_reminder", label: "Przypomnienia o treningu", description: "Dzień przed umówioną sesją z trenerem" },
    { type: "report_reminder", label: "Przypomnienie o raporcie", description: "W niedzielę, jeśli nie wysłano raportu tygodniowego" },
    { type: "review_request", label: "Prośba o opinię", description: "Raz, po miesiącu współpracy z trenerem" },
    { type: "email_fallback", label: "E-mail, gdy nie masz aplikacji", description: "Ważne wiadomości (terminy, plany) przyjdą e-mailem, jeśli nie masz aplikacji na telefonie" },
  ],
  trainer: [
    { type: "daily_summary", label: "Twój dzień", description: "Rano: sesje w kalendarzu i nieotwarte raporty (tylko gdy coś jest)" },
    { type: "weekly_summary", label: "Podsumowanie tygodnia", description: "W poniedziałek: treningi, raporty i zaległe płatności" },
    { type: "studio_announcement", label: "Ogłoszenia studia", description: "Wiadomości od właściciela studia" },
    { type: "email_fallback", label: "E-mail, gdy nie masz aplikacji", description: "Ważne wiadomości (terminy, plany) przyjdą e-mailem, jeśli nie masz aplikacji na telefonie" },
  ],
  gym_owner: [{ type: "weekly_summary", label: "Podsumowanie tygodnia", description: "W poniedziałek: statystyki całego studia" }],
};

const ALL_OPTIONAL_TYPES = new Set(Object.values(OPTIONS).flatMap((list) => list.map((option) => option.type)));

export function optionalNotifications(role: string | null | undefined): OptionalNotification[] {
  return role && role in OPTIONS ? OPTIONS[role as PreferenceRole] : [];
}

/** Only types this role may mute are kept; unknown values and duplicates are dropped. */
export function sanitizeMutedTypes(input: unknown, role: string | null | undefined): string[] {
  if (!Array.isArray(input)) return [];
  const allowed = new Set(optionalNotifications(role).map((option) => option.type));
  return [...new Set(input.filter((value): value is string => typeof value === "string" && allowed.has(value)))];
}

/** Cheap pre-check so transactional pushes never cost a preferences lookup. */
export function isOptionalNotificationType(type: string | null | undefined): boolean {
  return !!type && ALL_OPTIONAL_TYPES.has(type);
}
