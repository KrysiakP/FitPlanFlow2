import type { IStorage } from "../storage";
import { paymentNotice } from "../lib/paymentNotice";

type SendPush = (userId: string, title: string, body: string, data: Record<string, string>, type: string) => Promise<void>;

export const PAYMENT_PUSH_TYPE = "payment_due";

/**
 * Payment Notification Service
 * 
 * Checks for unpaid payments and creates notifications for:
 * - Overdue payments
 * - Payments due today
 * - Payments due in 3 days
 * 
 * Designed to be called by a scheduled job (Replit Scheduled Deployment)
 * instead of running on server startup.
 */

export async function checkPaymentNotifications(storage: IStorage, sendPush?: SendPush): Promise<{
  checked: number;
  created: number;
  skipped: number;
  errors: number;
}> {
  const stats = {
    checked: 0,
    created: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    console.log('[PAYMENT_NOTIFICATIONS] Checking unpaid payments...');
    
    const unpaidPayments = await storage.getUnreadPayments();
    stats.checked = unpaidPayments.length;
    console.log(`[PAYMENT_NOTIFICATIONS] Found ${unpaidPayments.length} unpaid payments`);
    
    const now = new Date();
    const names = new Map<string, string>();
    const nameOf = async (clientId: string) => {
      if (!names.has(clientId)) {
        const client = await storage.getUser(clientId).catch(() => undefined);
        names.set(clientId, [client?.firstName, client?.lastName].filter(Boolean).join(" "));
      }
      return names.get(clientId) ?? "";
    };
    
    for (const payment of unpaidPayments) {
      // Safely parse dueDate (could be Date object or string from database)
      const dueDate = new Date(payment.dueDate);
      
      // Normalize to start of day (00:00:00) for calendar-based comparison
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      
      const startOfDueDate = new Date(dueDate);
      startOfDueDate.setHours(0, 0, 0, 0);
      
      // Calculate difference in calendar days
      const DAY_MS = 1000 * 60 * 60 * 24;
      const daysDiff = Math.round((startOfDueDate.getTime() - startOfToday.getTime()) / DAY_MS);
      
      let notificationType: "upcoming" | "due_today" | "overdue" | null = null;
      if (daysDiff === 3) notificationType = "upcoming";
      else if (daysDiff === 0) notificationType = "due_today";
      else if (daysDiff < 0) notificationType = "overdue";

      if (notificationType) {
        try {
          const { title, body } = paymentNotice(notificationType, await nameOf(payment.clientId), payment.amount, daysDiff);
          await storage.createNotification({
            trainerId: payment.trainerId,
            clientId: payment.clientId,
            paymentId: payment.id,
            type: notificationType,
            title,
            body,
            metadata: { daysDiff, amount: payment.amount },
            isRead: false,
          });
          stats.created++;
          // The in-app notice exists only once per payment and kind, so the push goes out once as well
          if (sendPush) {
            await sendPush(payment.trainerId, title, body, { type: PAYMENT_PUSH_TYPE, paymentId: payment.id }, PAYMENT_PUSH_TYPE).catch((err) =>
              console.error("[PAYMENT_NOTIFICATIONS] Push failed:", err),
            );
          }
          console.log(`[PAYMENT_NOTIFICATIONS] Created ${notificationType} notification for payment ${payment.id}`);
        } catch (error: any) {
          // Unique constraint violation - notification already exists, skip silently
          if (error?.code === '23505') {
            stats.skipped++;
            console.log(`[PAYMENT_NOTIFICATIONS] Notification already exists for payment ${payment.id}, skipping`);
          } else {
            stats.errors++;
            console.error(`[PAYMENT_NOTIFICATIONS] Error creating notification for payment ${payment.id}:`, error);
          }
        }
      }
    }
    
    console.log(`[PAYMENT_NOTIFICATIONS] Completed: ${stats.checked} checked, ${stats.created} created, ${stats.skipped} skipped, ${stats.errors} errors`);
    return stats;
  } catch (error) {
    console.error('[PAYMENT_NOTIFICATIONS] Fatal error in payment notification check:', error);
    throw error;
  }
}
