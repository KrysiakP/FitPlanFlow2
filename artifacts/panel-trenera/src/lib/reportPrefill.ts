/** Values that change slowly (measurements, supplements) are carried over from earlier reports, so the new one starts half filled. */

export const CARRIED_FIELDS = ["chest", "waist", "hips", "arm", "leg", "supplements"] as const;
export type CarriedField = (typeof CARRIED_FIELDS)[number];

type ReportLike = { reportDate: string | Date } & Partial<Record<CarriedField, string | null>>;

/** For each carried field the value from the newest report that has one; fields never filled in are left out. */
export function prefillFromReports(reports: ReportLike[] | undefined): Partial<Record<CarriedField, string>> {
  const newestFirst = [...(reports ?? [])].sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
  const result: Partial<Record<CarriedField, string>> = {};
  for (const field of CARRIED_FIELDS) {
    const source = newestFirst.find((report) => typeof report[field] === "string" && report[field]!.trim() !== "");
    if (source) result[field] = source[field]!.trim();
  }
  return result;
}
