/**
 * A best-effort shopping list from meal descriptions ("100 g ryżu, 2 jajka, 1,5 l mleka").
 * Only parts with a quantity are listed; instructions and parts without a number are ignored on purpose,
 * because guessing at free text would put "wymieszać" on the list.
 */

export interface ShoppingItem {
  name: string;
  amount: number;
  unit: "g" | "ml" | "szt." | "łyżki" | "łyżeczki" | "szklanki" | "";
}

const UNIT_PATTERN = "kg|dag|g|ml|l|szt\\.?|sztuk[ia]?|łyżk\\w*|łyżeczk\\w*|szklank\\w*";
const LEADING = new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_PATTERN})?\\s+(.+)$`, "i");
const LEADING_GLUED = new RegExp(`^(\\d+(?:[.,]\\d+)?)(${UNIT_PATTERN})\\s*(.+)$`, "i");
const TRAILING = new RegExp(`^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_PATTERN})$`, "i");

function normalizeUnit(raw: string | undefined, amount: number): { amount: number; unit: ShoppingItem["unit"] } {
  const unit = (raw ?? "").toLowerCase().replace(/\.$/, "");
  if (unit === "kg") return { amount: amount * 1000, unit: "g" };
  if (unit === "dag") return { amount: amount * 10, unit: "g" };
  if (unit === "g") return { amount, unit: "g" };
  if (unit === "l") return { amount: amount * 1000, unit: "ml" };
  if (unit === "ml") return { amount, unit: "ml" };
  if (unit.startsWith("łyżeczk")) return { amount, unit: "łyżeczki" };
  if (unit.startsWith("łyżk")) return { amount, unit: "łyżki" };
  if (unit.startsWith("szklank")) return { amount, unit: "szklanki" };
  return { amount, unit: unit.startsWith("szt") ? "szt." : "" };
}

const cleanName = (value: string) =>
  value
    .replace(/\(.*?\)/g, "")
    .replace(/^(?:z|ze|of|\bx\b)\s+/i, "")
    .replace(/[.:!]+$/, "")
    .trim()
    .toLowerCase();

function parsePart(part: string): ShoppingItem | null {
  const text = part.replace(/^[-•*–\d]+\.\s+|^[-•*–]\s*/, "").trim();
  if (!text || text.length > 60) return null; // long parts are recipe steps
  const match = LEADING_GLUED.exec(text) ?? LEADING.exec(text);
  let quantity: string | undefined;
  let rawUnit: string | undefined;
  let name: string | undefined;
  if (match) [, quantity, rawUnit, name] = match;
  else {
    const trailing = TRAILING.exec(text);
    if (trailing) [, name, quantity, rawUnit] = trailing;
  }
  if (!quantity || !name) return null;
  const value = Number(quantity.replace(",", "."));
  const cleaned = cleanName(name);
  if (!Number.isFinite(value) || value <= 0 || cleaned.length < 2 || /^\d/.test(cleaned)) return null;
  return { name: cleaned, ...normalizeUnit(rawUnit, value) };
}

export function buildShoppingList(descriptions: (string | null | undefined)[]): ShoppingItem[] {
  const merged = new Map<string, ShoppingItem>();
  for (const description of descriptions) {
    if (!description) continue;
    for (const part of description.split(/\n|;|,\s+/)) {
      const item = parsePart(part);
      if (!item) continue;
      const key = `${item.name}|${item.unit}`;
      const existing = merged.get(key);
      if (existing) existing.amount += item.amount;
      else merged.set(key, { ...item });
    }
  }
  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name, "pl"));
}

export function formatAmount(item: ShoppingItem): string {
  const round = (value: number) => String(Math.round(value * 10) / 10).replace(".", ",");
  if (item.unit === "g") return item.amount >= 1000 ? `${round(item.amount / 1000)} kg` : `${round(item.amount)} g`;
  if (item.unit === "ml") return item.amount >= 1000 ? `${round(item.amount / 1000)} l` : `${round(item.amount)} ml`;
  return `${round(item.amount)}${item.unit ? ` ${item.unit}` : ""}`;
}
