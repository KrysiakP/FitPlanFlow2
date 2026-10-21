/** Where a notification in the web bell leads, by role. Unknown kinds go nowhere (the item is only marked as read). */

const CLIENT_LINKS: Record<string, string> = {
  plan_assigned: "/my-plan",
  workout_reminder: "/my-plan",
  session_booked: "/",
  session_cancelled: "/",
  session_reminder: "/",
  report_reminder: "/weekly-report",
  review_request: "/my-trainer",
  new_message: "/chat",
  payment: "/payment-schedule",
};

const TRAINER_LINKS: Record<string, string> = {
  invitation_accepted: "/clients",
  client_reminder: "/clients",
  new_message: "/chat",
  weekly_summary: "/",
  payment: "/payment-schedule",
};

export function notificationLink(type: string | null | undefined, role: "client" | "trainer"): string | null {
  if (!type) return null;
  return (role === "client" ? CLIENT_LINKS : TRAINER_LINKS)[type] ?? null;
}
