/** The wording of the trainer's payment notices: who owes what, and since or until when. */

export type PaymentNoticeKind = "upcoming" | "due_today" | "overdue";

function days(n: number): string {
  return n === 1 ? "1 dzień" : `${n} dni`; // Polish "dni" is right for every other number
}

/** Amounts are stored in grosze; "1 234,50 zł" in Polish style. */
export function formatPln(grosze: number): string {
  const [whole, cents] = (grosze / 100).toFixed(2).split(".");
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${cents} zł`;
}

export function paymentNotice(kind: PaymentNoticeKind, clientName: string, amountGrosze: number, daysDiff: number): { title: string; body: string } {
  const who = clientName.trim() || "Podopieczny";
  const amount = formatPln(amountGrosze);
  if (kind === "upcoming") return { title: "Zbliżający się termin płatności", body: `${who}: płatność ${amount} za ${days(Math.max(1, daysDiff))}.` };
  if (kind === "due_today") return { title: "Płatność dzisiaj", body: `${who}: płatność ${amount} jest dziś.` };
  return { title: "Przeterminowana płatność", body: `${who}: płatność ${amount} jest przeterminowana o ${days(Math.max(1, Math.abs(daysDiff)))}.` };
}
