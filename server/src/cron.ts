import cron from "node-cron";
import { and, eq, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "./db.js";
import {
  payments,
  passwordResetTokens,
  visitors,
  smsQuotas,
  smsGlobalQuota,
} from "@shared/schema.js";
import { lucia } from "./auth.js";
import { stkPushStatus } from "./lib/mpesa.js";
import { logger } from "./lib/logger.js";

const log = logger.child({ component: "cron" });

// Each job is wrapped in try/catch so one failing cron never crashes the
// process. node-cron handles its own scheduling via setInterval; on a
// single-instance Render plan this is safe. Multi-instance scaling needs
// a leader-election (e.g. pg advisory lock).

export function registerCronJobs() {
  // ── 1. Reconciliation: settle stuck pending payments ──────────────────
  // Runs every 5 minutes. Picks payments older than 2 minutes and still
  // pending, queries Daraja STK Status, and settles them. Idempotent —
  // the same callback path that the public webhook uses, so a settled
  // payment will be a no-op on the next tick.
  cron.schedule("*/5 * * * *", async () => {
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
          // Daraja confirms success but our callback never arrived.
          // Mark completed; we don't have the receipt number from this
          // endpoint, so leave mpesaRef NULL — admin can reconcile from
          // Safaricom dashboard if needed.
          await db
            .update(payments)
            .set({ status: "completed", updatedAt: new Date() })
            .where(eq(payments.id, p.id));
        } else if (status.ResultCode !== 1) {
          // Anything other than "still processing" (1) is terminal failure.
          await db
            .update(payments)
            .set({ status: "failed", updatedAt: new Date() })
            .where(eq(payments.id, p.id));
        }
      }
    } catch (err) {
      log.error({ event: "reconciliation_failed", err }, "reconciliation cron failed");
    }
  });

  // ── 2. Daily 03:00 cleanup ────────────────────────────────────────────
  cron.schedule("0 3 * * *", async () => {
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
    } catch (err) {
      log.error({ event: "daily_cleanup_failed", err }, "daily cleanup cron failed");
    }
  });

  // ── 3. Visitor PII retention (Kenya DPA Article 25) ───────────────────
  // Anonymize visitor records older than 90 days. Keeps the row for
  // analytics/audit but strips PII (name, phone). Runs weekly.
  cron.schedule("0 4 * * 0", async () => {
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
      log.error({ event: "visitor_purge_failed", err }, "visitor purge cron failed");
    }
  });

  log.info(
    { jobs: ["reconcile_payments_5min", "daily_cleanup", "visitor_purge_weekly"] },
    "cron jobs registered",
  );
}
