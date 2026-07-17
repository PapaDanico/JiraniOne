import { and, eq, gt, lte, isNull, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "./db.js";
import {
  payments,
  passwordResetTokens,
  visitors,
  smsQuotas,
  smsGlobalQuota,
  auditLogs,
  events,
  eventRsvps,
  users,
} from "@shared/schema.js";
import { lucia } from "./auth.js";
import { stkPushStatus } from "./lib/mpesa.js";
import { logger } from "./lib/logger.js";
import { settlePaymentById } from "./routes/payments.js";
import { createNotification } from "./lib/notify.js";
import { sendThrottledSms } from "./lib/sms.js";

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

// Notify every "attending" RSVP for one event, in-app + SMS (best-effort —
// one recipient's SMS failure doesn't block the rest or the notification).
async function notifyAttendees(eventId: string, title: string, body: string) {
  const attendees = await db
    .select({ userId: users.id, phone: users.phone })
    .from(eventRsvps)
    .innerJoin(users, eq(eventRsvps.userId, users.id))
    .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.attending, true)));

  for (const a of attendees) {
    await createNotification({
      userId: a.userId,
      title,
      body,
      type: "event_reminder",
      linkTo: "/events",
    });
    try {
      await sendThrottledSms({ userId: a.userId, to: a.phone, message: `${title}: ${body}` });
    } catch (err) {
      log.error({ event: "event_reminder_sms_failed", eventId, userId: a.userId, err }, "reminder SMS failed");
    }
  }
}

// Event reminders (CLAUDE.md: "Event reminders 24h + 1h before"). Runs
// every 15 minutes (see netlify/functions/event-reminders.ts); each tier
// fires once an event falls inside its window and hasn't been sent yet
// (reminder{24h,1h}SentAt IS NULL), rather than matching an exact 15-minute
// slot — that stays correct even if a run is skipped or delayed, at the
// cost of occasionally sending "tomorrow" and "in an hour" back-to-back
// for an event created less than an hour before it starts.
export async function sendEventReminders() {
  const now = new Date();

  try {
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dueFor24h = await db
      .select({ id: events.id, title: events.title, startTime: events.startTime })
      .from(events)
      .where(and(gt(events.startTime, now), lte(events.startTime, in24h), isNull(events.reminder24hSentAt)))
      .limit(50);

    for (const e of dueFor24h) {
      await notifyAttendees(e.id, `Reminder: ${e.title}`, `Happening ${e.startTime.toLocaleString("en-KE", { weekday: "long", hour: "2-digit", minute: "2-digit" })}.`);
      await db.update(events).set({ reminder24hSentAt: now }).where(eq(events.id, e.id));
    }
  } catch (err) {
    log.error({ event: "event_reminder_24h_failed", err }, "24h event reminder job failed");
  }

  try {
    const in1h = new Date(now.getTime() + 60 * 60 * 1000);
    const dueFor1h = await db
      .select({ id: events.id, title: events.title, startTime: events.startTime })
      .from(events)
      .where(and(gt(events.startTime, now), lte(events.startTime, in1h), isNull(events.reminder1hSentAt)))
      .limit(50);

    for (const e of dueFor1h) {
      await notifyAttendees(e.id, `Starting soon: ${e.title}`, `Starts at ${e.startTime.toLocaleString("en-KE", { hour: "2-digit", minute: "2-digit" })}.`);
      await db.update(events).set({ reminder1hSentAt: now }).where(eq(events.id, e.id));
    }
  } catch (err) {
    log.error({ event: "event_reminder_1h_failed", err }, "1h event reminder job failed");
  }
}
