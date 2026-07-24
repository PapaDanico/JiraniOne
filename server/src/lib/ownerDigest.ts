import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { db } from "../db.js";
import {
  users,
  estates,
  leads,
  payments,
  subscriptionInvoices,
  errorLogs,
} from "@shared/schema.js";
import { createNotification } from "./notify.js";
import { logger } from "./logger.js";
import { BRAND_NAME } from "@shared/brand.js";

const log = logger.child({ component: "owner_digest" });

// Monday-morning platform digest for the owner — the numbers that already
// exist across leads/billing/reconciliation/error-logs, pushed instead of
// waiting to be looked up. In-app notification (which also fans out via
// Web Push). No-op when PLATFORM_OWNER_PHONE is unset or doesn't match a
// user, same fail-closed posture as requirePlatformOwner.
export async function sendOwnerWeeklyDigest(): Promise<void> {
  try {
    const ownerPhone = process.env.PLATFORM_OWNER_PHONE;
    if (!ownerPhone) return;

    const [owner] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.phone, ownerPhone), isNull(users.deletedAt)))
      .limit(1);
    if (!owner) return;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [newLeads] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(leads)
      .where(gt(leads.createdAt, weekAgo));

    const [newEstates] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(estates)
      .where(gt(estates.createdAt, weekAgo));

    const [trialsEnding] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(estates)
      .where(and(
        eq(estates.billingExempt, false),
        gt(estates.trialEndsAt, now),
        lt(estates.trialEndsAt, weekAhead),
      ));

    const [unpaid] = await db
      .select({
        n: sql<number>`count(*)::int`,
        total: sql<string>`coalesce(sum(amount), 0)::text`,
      })
      .from(subscriptionInvoices)
      .where(eq(subscriptionInvoices.status, "pending"));

    const [stuck] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(payments)
      .where(and(eq(payments.status, "pending"), lt(payments.createdAt, hourAgo)));

    const [errors] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(errorLogs)
      .where(gt(errorLogs.createdAt, weekAgo));

    const unpaidTotal = Number(unpaid?.total ?? 0);
    const parts = [
      `Leads: ${newLeads?.n ?? 0} new`,
      `Estates: ${newEstates?.n ?? 0} new, ${trialsEnding?.n ?? 0} trial(s) ending within 7 days`,
      `Billing: ${unpaid?.n ?? 0} unpaid invoice(s)${unpaidTotal > 0 ? ` (KES ${unpaidTotal.toLocaleString("en-KE")})` : ""}`,
      `Payments: ${stuck?.n ?? 0} stuck pending >1h`,
      `Errors: ${errors?.n ?? 0} this week`,
    ];

    await createNotification({
      userId: owner.id,
      title: `${BRAND_NAME} weekly digest`,
      body: parts.join(" · ") + ".",
      type: "system_digest",
      linkTo: "/dashboard/admin",
    });
  } catch (err) {
    log.error({ event: "owner_digest_failed", err }, "owner weekly digest failed");
  }
}

// Month-open nudge: on the 1st, tell every estate admin their previous
// month's report is ready to view/print. The report itself renders live
// from analytics (client/src/pages/admin/report.tsx) — this is the
// reminder so the AGM-ready summary gets used without anyone remembering
// to click. Idempotent: only fires when today is the 1st, and the daily
// billing cron already guards against double-invoicing, so at most one
// notification per admin per month-open.
export async function sendMonthlyReportNudge(): Promise<void> {
  const now = new Date();
  if (now.getUTCDate() !== 1) return; // only on month-open

  try {
    const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const monthLabel = lastMonth.toLocaleDateString("en-KE", { month: "long", year: "numeric", timeZone: "UTC" });

    const admins = await db
      .select({ adminId: estates.adminId })
      .from(estates)
      .limit(1000);

    for (const e of admins) {
      if (!e.adminId) continue;
      try {
        await createNotification({
          userId: e.adminId,
          title: `${monthLabel} estate report ready`,
          body: `Your ${monthLabel} summary — collections, tickets, visitors, incidents — is ready to view or print for the committee.`,
          type: "monthly_report",
          linkTo: "/admin/report",
        });
      } catch (err) {
        log.error({ event: "monthly_report_nudge_row_failed", adminId: e.adminId, err }, "monthly report nudge failed for one admin");
      }
    }
  } catch (err) {
    log.error({ event: "monthly_report_nudge_failed", err }, "monthly report nudge job failed");
  }
}
