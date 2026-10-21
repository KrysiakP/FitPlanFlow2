// "Who needs attention": a short, ranked list for the trainer's dashboard.

export interface AttentionClient {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

export type AttentionReasonType = "overdue_payment" | "no_plan" | "inactive" | "never_trained" | "new_report";

export interface AttentionReason {
  type: AttentionReasonType;
  label: string;
}

export interface AttentionItem {
  clientId: string;
  name: string;
  score: number;
  reasons: AttentionReason[];
}

export interface AttentionInput {
  clients: AttentionClient[];
  lastSessionAt: Map<string, Date>; // client id -> most recent finished workout
  assignedClientIds: Set<string>; // clients with a plan
  overduePayments: Map<string, number>; // client id -> unpaid payments past their due date
  unreadReports: Map<string, number>; // client id -> weekly reports the trainer has not opened
  now?: Date;
  inactiveAfterDays?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function plural(n: number, one: string, few: string, many: string): string {
  const lastTwo = n % 100;
  const last = n % 10;
  if (n === 1) return one;
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? few : many;
}

export function buildAttentionList({
  clients,
  lastSessionAt,
  assignedClientIds,
  overduePayments,
  unreadReports,
  now = new Date(),
  inactiveAfterDays = 7,
}: AttentionInput): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const client of clients) {
    const reasons: AttentionReason[] = [];
    let score = 0;

    const overdue = overduePayments.get(client.id) ?? 0;
    if (overdue > 0) {
      reasons.push({ type: "overdue_payment", label: `${overdue} ${plural(overdue, "zaległa płatność", "zaległe płatności", "zaległych płatności")}` });
      score += 40 + overdue;
    }

    if (!assignedClientIds.has(client.id)) {
      reasons.push({ type: "no_plan", label: "Brak przypisanego planu" });
      score += 30;
    } else {
      const last = lastSessionAt.get(client.id);
      if (!last) {
        reasons.push({ type: "never_trained", label: "Jeszcze nie trenował(a)" });
        score += 20;
      } else {
        const days = Math.floor((now.getTime() - last.getTime()) / DAY_MS);
        if (days >= inactiveAfterDays) {
          reasons.push({ type: "inactive", label: `Bez treningu od ${days} ${plural(days, "dnia", "dni", "dni")}` });
          score += 10 + Math.min(days, 30);
        }
      }
    }

    const reports = unreadReports.get(client.id) ?? 0;
    if (reports > 0) {
      reasons.push({ type: "new_report", label: `${reports} ${plural(reports, "nowy raport", "nowe raporty", "nowych raportów")}` });
      score += 5;
    }

    if (reasons.length > 0) {
      const name = [client.firstName, client.lastName].filter(Boolean).join(" ").trim() || "Podopieczny";
      items.push({ clientId: client.id, name, score, reasons });
    }
  }

  return items.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "pl"));
}
