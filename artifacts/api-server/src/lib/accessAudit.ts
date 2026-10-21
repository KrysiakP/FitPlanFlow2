/** Which trainer read endpoints expose a client's data, and the label the client sees. */
const RULES: { pattern: RegExp; action: string }[] = [
  { pattern: /^\/api\/clients\/([^/]+)\/profile$/, action: "profile" },
  { pattern: /^\/api\/clients\/([^/]+)\/reports$/, action: "reports" },
  { pattern: /^\/api\/trainer\/clients\/([^/]+)\/(?:progress|exercise-logs|workout-sessions|exercise-history)$/, action: "training" },
  { pattern: /^\/api\/trainer\/clients\/([^/]+)\/active-diet$/, action: "diet" },
];

export const ACTION_LABELS: Record<string, string> = {
  profile: "profil i dane zdrowotne",
  reports: "raporty tygodniowe i zdjęcia",
  training: "treningi i postępy",
  diet: "plan diety",
};

export function accessFromRequest(method: string, path: string): { subjectId: string; action: string } | null {
  if (method !== "GET") return null;
  for (const rule of RULES) {
    const match = rule.pattern.exec(path);
    if (match) return { subjectId: decodeURIComponent(match[1]), action: rule.action };
  }
  return null;
}
