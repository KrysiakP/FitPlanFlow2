/** How long clients stay with a trainer: the number a coach can act on (who leaves, and after how long). */

export interface RelationshipRow {
  createdAt: Date | string;
  archivedAt: Date | string | null;
  status: string;
}

export interface Retention {
  activeClients: number;
  endedClients: number;
  averageMonths: number | null; // average length of all collaborations, ended ones up to their end, active ones up to now
  retention90: number | null; // % of collaborations older than 90 days that lasted at least 90 days (null: none that old yet)
}

const DAY = 24 * 3600 * 1000;
const round1 = (value: number) => Math.round(value * 10) / 10;

export function computeRetention(rows: RelationshipRow[], now: Date = new Date()): Retention {
  const lengths = rows.map((row) => {
    const start = new Date(row.createdAt).getTime();
    const end = row.status === "active" || !row.archivedAt ? now.getTime() : new Date(row.archivedAt).getTime();
    return { start, days: Math.max(0, (end - start) / DAY), active: row.status === "active" };
  });
  const old = lengths.filter((item) => now.getTime() - item.start >= 90 * DAY);
  const kept = old.filter((item) => item.active || item.days >= 90);
  return {
    activeClients: lengths.filter((item) => item.active).length,
    endedClients: lengths.filter((item) => !item.active).length,
    averageMonths: lengths.length ? round1(lengths.reduce((sum, item) => sum + item.days, 0) / lengths.length / 30.4) : null,
    retention90: old.length ? Math.round((kept.length / old.length) * 100) : null,
  };
}
