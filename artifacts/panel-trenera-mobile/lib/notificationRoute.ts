// Where a tapped push notification should take the user (pure, so it can be unit-tested with node)

export type NotificationRole = "trainer" | "client" | "gym_owner";

const ROUTES: Record<NotificationRole, Record<string, string>> = {
  client: {
    plan_assigned: "/(client)/training",
    workout_reminder: "/(client)/training",
    session_booked: "/(client)",
    session_cancelled: "/(client)",
    session_reminder: "/(client)",
    report_reminder: "/(client)/weekly-report",
    review_request: "/(client)/profile",
  },
  trainer: {
    invitation_accepted: "/(trainer)/clients",
    session_booked: "/(trainer)/kalendarz-trenera",
    session_cancelled: "/(trainer)/kalendarz-trenera",
    studio_announcement: "/(trainer)/profile",
    weekly_summary: "/(trainer)/business-stats",
    trial_ending: "/(trainer)/profile",
    client_reminder: "/(trainer)/clients",
  },
  gym_owner: {
    weekly_summary: "/(gym)/analytics",
  },
};

const FALLBACK: Partial<Record<NotificationRole, string>> = {
  client: "/(client)/notifications",
  trainer: "/(trainer)/notifications",
};

/** Screen for a push of the given type, the notification history when the type is unknown, null when there is nowhere to go. */
export function notificationRoute(type: unknown, role: NotificationRole | null | undefined): string | null {
  if (!role) return null;
  if (typeof type === "string" && ROUTES[role][type]) return ROUTES[role][type];
  return FALLBACK[role] ?? null;
}
