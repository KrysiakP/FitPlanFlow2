/** One month into a collaboration the client is asked, once, how it is going; the answer becomes a public review. */

export const REVIEW_REQUEST_AFTER_DAYS = 30;
export const REVIEW_REQUEST_WINDOW_DAYS = 7; // a client who was offline on day 30 is still asked during the next week

// Polish names do not decline reliably, so the name appears as an apposition ("trenera Tomek"), never inside a case ending
export function formatReviewRequest(trainerFirstName: string | null | undefined): { title: string; body: string } {
  const who = trainerFirstName?.trim();
  return {
    title: "Jak oceniasz współpracę z trenerem?",
    body: `Oceń trenera${who ? ` ${who}` : ""} w zakładce Profil. To chwila, a Twoja opinia pomoże innym wybrać trenera.`,
  };
}
