/** Search and filters for the trainer's exercise library; matching ignores case and Polish diacritics ("ciag" finds "Martwy ciąg"). */

export interface LibraryItem {
  name: string;
  category?: string | null;
  description?: string | null;
  videoUrl?: string | null;
  isFavorite?: boolean | null;
}

export interface LibraryFilter {
  query: string;
  category: string | null;
  onlyWithVideo: boolean;
  onlyFavorites?: boolean;
}

/** Lower case without diacritics; "ł" does not decompose, so it is mapped by hand. */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function filterLibrary<T extends LibraryItem>(items: T[], filter: LibraryFilter): T[] {
  const words = fold(filter.query).split(/\s+/).filter(Boolean);
  const matching = items.filter((item) => {
    if (filter.onlyWithVideo && !item.videoUrl) return false;
    if (filter.onlyFavorites && !item.isFavorite) return false;
    if (filter.category !== null && (item.category ?? "").trim() !== filter.category) return false;
    if (words.length === 0) return true;
    const haystack = fold(`${item.name} ${item.category ?? ""} ${item.description ?? ""}`);
    return words.every((word) => haystack.includes(word));
  });
  // starred exercises come first; the order inside each group stays as it was
  return [...matching.filter((item) => item.isFavorite), ...matching.filter((item) => !item.isFavorite)];
}

/** Distinct, non-empty categories sorted the Polish way. */
export function libraryCategories(items: LibraryItem[]): string[] {
  const set = new Set(items.map((item) => (item.category ?? "").trim()).filter(Boolean));
  return [...set].sort((a, b) => a.localeCompare(b, "pl"));
}
