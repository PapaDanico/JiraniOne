import { and, eq, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "./db.js";
import {
  payments,
  passwordResetTokens,
  visitors,
  smsQuotas,
  smsGlobalQuota,
  auditLogs,
} from "@shared/schema.js";
import { lucia } from "./auth.js";
import { stkPushStatus } from "./lib/mpesa.js";
import { logger } from "./lib/logger.js";
import { settlePaymentById } from "./routes/payments.js";

const log = logger.child({ component: "cron" });

// These three jobs used to be scheduled in-process via node-cron. Netlify
// Functions have no persistent process to hold a setInterval-based
// scheduler, so each is now a standalone, idempotent function invoked by a
// Netlify Scheduled Function (see netlify/functions/*.ts) instead.

// Reconciliation: settle stuck pending payments. Picks payments older than
// 2 minutes and still pending, queries Daraja STK Status, and settles
// them. Idempotent — the same callback path the public webhook uses, so a
// settled payment is a no-op on the next run.
export async function reconcilePendingPayments() {
  try {
    const stale = await db
      .select({
        id: payments.id,
        checkoutRequestId: payments.checkoutRequestId,
      })
      .from(payments)
      .where(
        and(
          eq(payments.status, "pending"),
          isNotNull(payments.checkoutRequestId),
          lt(payments.createdAt, new Date(Date.now() - 2 * 60 * 1000)),
        ),
      )
      .limit(50);

    for (const p of stale) {
      if (!p.checkoutRequestId) continue;
      const status = await stkPushStatus(p.checkoutRequestId);
      if (!status) continue;

      if (status.ResultCode === 0) {
        // Daraja confirms success but our callback never arrived. Settle via
        // the same path the webhook uses — this creates the donation/chama
        // contribution row and credits the campaign total, not just the
        // payments.status flip (a prior version of this job only did the
        // latter, silently losing the downstream record whenever a callback
        // was lost). We don't have the receipt number from this endpoint,
        // so mpesaRef stays NULL — admin can reconcile from the Safaricom
        // dashboard if needed.
        await settlePaymentById(p.id, { success: true, mpesaRef: null });
      } else if (status.ResultCode !== 1) {
        // Anything other than "still processing" (1) is terminal failure.
        await settlePaymentById(p.id, { success: false, mpesaRef: null });
      }
    }
  } catch (err) {
    log.error({ event: "reconciliation_failed", err }, "reconciliation job failed");
  }
}

export async function runDailyCleanup() {
  try {
    // Lucia v3 requires manual session cleanup — without this, the
    // sessions table grows without bound.
    await lucia.deleteExpiredSessions();

    // Drop consumed or expired password-reset tokens older than 7 days.
    await db
      .delete(passwordResetTokens)
      .where(
        lt(
          passwordResetTokens.createdAt,
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        ),
      );

    // Stale per-user SMS counters older than 7 days.
    await db
      .delete(smsQuotas)
      .where(
        lt(
          smsQuotas.day,
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        ),
      );

    // Stale global quota rows older than 30 days.
    await db
      .delete(smsGlobalQuota)
      .where(
        lt(
          smsGlobalQuota.day,
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        ),
      );

    // Audit log retention (2 years, matching the published Privacy Policy —
    // this job previously didn't exist, so audit_logs grew unbounded and
    // the "2 years" retention promise was unenforced).
    await db
      .delete(auditLogs)
      .where(
        lt(
          auditLogs.createdAt,
          new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000),
        ),
      );
  } catch (err) {
    log.error({ event: "daily_cleanup_failed", err }, "daily cleanup job failed");
  }
}

// Visitor PII retention (Kenya DPA Article 25). Anonymize visitor records
// older than 90 days. Keeps the row for analytics/audit but strips PII
// (name, phone). Idempotent via the "already anonymized" guard.
export async function anonymizeOldVisitors() {
  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    await db
      .update(visitors)
      .set({
        name: "Visitor (anonymized)",
        phone: "+254000000000",
        purpose: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          lt(visitors.createdAt, cutoff),
          sql`${visitors.name} != 'Visitor (anonymized)'`,
        ),
      );
  } catch (err) {
    log.error({ event: "visitor_purge_failed", err }, "visitor purge job failed");
  }
}
