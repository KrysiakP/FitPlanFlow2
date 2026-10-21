/** Quick replies for trainers; custom ones are kept in the browser (localStorage), per device. */

export const DEFAULT_TEMPLATES = [
  "Świetna robota! Tak trzymać.",
  "Pamiętaj o raporcie tygodniowym do niedzieli.",
  "Jak się czujesz po ostatnim treningu?",
  "Jeśli coś boli albo coś jest za trudne, daj znać, dostosujemy plan.",
  "Dziś trening zgodnie z planem. Powodzenia!",
];

export const MAX_CUSTOM_TEMPLATES = 8;
export const MAX_TEMPLATE_LENGTH = 300;
const STORAGE_KEY = "chat-templates-v1";

/** Trims, collapses spaces, limits the length, ignores empty text and duplicates (also of the defaults). */
export function addTemplate(existing: string[], text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim().slice(0, MAX_TEMPLATE_LENGTH).trim();
  if (!clean) return existing;
  const taken = new Set([...DEFAULT_TEMPLATES, ...existing].map((item) => item.toLowerCase()));
  if (taken.has(clean.toLowerCase())) return existing;
  return [...existing, clean].slice(-MAX_CUSTOM_TEMPLATES);
}

/** Inserts a template into what is already typed: replaces an empty box, otherwise appends on a new sentence. */
export function insertTemplate(current: string, template: string): string {
  const trimmed = current.trimEnd();
  return trimmed ? `${trimmed} ${template}` : template;
}

export function loadCustomTemplates(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, MAX_CUSTOM_TEMPLATES) : [];
  } catch {
    return [];
  }
}

export function saveCustomTemplates(templates: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {
    /* storage can be blocked (private window); templates then last until the page is closed */
  }
}
