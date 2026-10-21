/**
 * Editing a plan must keep the workouts and exercises the clients already trained on: their history hangs on those rows
 * (deleting one deletes the logged sets). Each incoming item is matched to an existing one by id first, then by name;
 * an existing row is used at most once, and whatever is left over is what the trainer really removed.
 */

export interface Matchable {
  id: string;
  name: string;
}

export interface IncomingItem {
  id?: string | null;
  name: string;
}

export interface MatchResult<T extends Matchable> {
  /** For each incoming item, in order: the existing row it updates, or null when it is new. */
  matches: (T | null)[];
  /** Existing rows nothing was matched to: these are the ones to delete. */
  removed: T[];
}

const norm = (name: string) => name.trim().toLowerCase();

export function matchExisting<T extends Matchable>(existing: T[], incoming: IncomingItem[]): MatchResult<T> {
  const used = new Set<string>();
  const byId = new Map(existing.map((row) => [row.id, row]));
  const matches: (T | null)[] = incoming.map(() => null);

  // pass 1: a known id that is not taken yet
  incoming.forEach((item, index) => {
    const row = item.id ? byId.get(item.id) : undefined;
    if (row && !used.has(row.id)) {
      used.add(row.id);
      matches[index] = row;
    }
  });
  // pass 2: items without a usable id take the first free row with the same name
  incoming.forEach((item, index) => {
    if (matches[index]) return;
    const row = existing.find((candidate) => !used.has(candidate.id) && norm(candidate.name) === norm(item.name));
    if (row) {
      used.add(row.id);
      matches[index] = row;
    }
  });

  return { matches, removed: existing.filter((row) => !used.has(row.id)) };
}
