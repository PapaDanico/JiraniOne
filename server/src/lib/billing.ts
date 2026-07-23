import { and, asc, eq, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { db } from "../db.js";
import { estates, subscriptionInvoices, users } from "@shared/schema.js";
import {
  PLANS,
  INVOICE_DUE_DAYS,
  computeBillingState,
  periodKey,
  periodLabel,
  tierForUnits,
  type BillingState,
} from "@shared/billing.js";
import { newId } from "./ids.js";
import { logger } from "./logger.js";
import { createNotification } from "./notify.js";
import { sendThrottledSms } from "./sms.js";
import { BRAND_NAME } from "@shared/brand.js";

const log = logger.child({ component: "billing" });

/**
 * Billing snapshot for one estate: derived state + the oldest unpaid
 * invoice (the one a "Pay now" should settle first).
 */
export async function getBillingSnapshot(estateId: string): Promise<{
  state: BillingState;
  trialEndsAt: Date | null;
  oldestUnpaid: typeof subscriptionInvoices.$inferSelect | null;
} | null> {
  const [estate] = await db
    .select({
      billingExempt: estates.billingExempt,
      trialEndsAt: estates.trialEndsAt,
    })
    .from(estates)
    .where(eq(estates.id, estateId))
    .limit(1);
  if (!estate) return null;

  const [oldestUnpaid] = await db
    .select()
    .from(subscriptionInvoices)
    .where(
      and(
        eq(subscriptionInvoices.estateId, estateId),
        eq(subscriptionInvoices.status, "pending"),
      ),
    )
    .orderBy(asc(subscriptionInvoices.dueDate))
    .limit(1);

  return {
    state: computeBillingState({
      billingExempt: estate.billingExempt,
      trialEndsAt: estate.trialEndsAt,
      oldestUnpaidDueAt: oldestUnpaid?.dueDate ?? null,
    }),
    trialEndsAt: estate.trialEndsAt,
    oldestUnpaid: oldestUnpaid ?? null,
  };
}

/**
 * Idempotent monthly invoice generation, invoked daily by the billing
 * scheduled function. For every billable estate (not exempt, trial lapsed)
 * without an invoice for the current calendar month: derive the tier from
 * the CURRENT unit count, insert the invoice, sync estates.subscriptionTier
 * to match, and notify the estate admin in-app. The (estateId, period)
 * unique index makes a doubled run a no-op, not a double bill.
 *
 * Also sends a one-time overdue nag (in-app + SMS to the admin) once an
 * invoice passes its due date, claimed atomically via overdueNotifiedAt.
 */
export async function generateSubscriptionInvoices(): Promise<void> {
  const now = new Date();
  const period = periodKey(now);

  try {
    const billable = await db
      .select({
        id: estates.id,
        name: estates.name,
        adminId: estates.adminId,
        totalUnits: estates.totalUnits,
        subscriptionTier: estates.subscriptionTier,
      })
      .from(estates)
      .where(
        and(
          eq(estates.billingExempt, false),
          // Trial must have explicitly lapsed. NULL trialEndsAt (estate
          // predates billing and was never backfilled) deliberately does
          // NOT bill — never invoice an estate that was never told about
          // a trial clock.
          isNotNull(estates.trialEndsAt),
          lt(estates.trialEndsAt, now),
          // Skip estates that already have this month's invoice.
          sql`NOT EXISTS (
            SELECT 1 FROM subscription_invoices si
             WHERE si.estate_id = ${estates.id} AND si.period = ${period}
          )`,
        ),
      )
      .limit(500);

    for (const estate of billable) {
      try {
        const tier = tierForUnits(estate.totalUnits);
        const plan = PLANS[tier];
        const dueDate = new Date(now.getTime() + INVOICE_DUE_DAYS * 24 * 60 * 60 * 1000);

        const inserted = await db
          .insert(subscriptionInvoices)
          .values({
            id: newId(),
            estateId: estate.id,
            period,
            tier,
            amount: String(plan.monthlyKes),
            dueDate,
          })
          .onConflictDoNothing()
          .returning({ id: subscriptionInvoices.id });
        if (inserted.length === 0) continue; // raced another run — theirs won

        if (estate.subscriptionTier !== tier) {
          await db
            .update(estates)
            .set({ subscriptionTier: tier, updatedAt: now })
            .where(eq(estates.id, estate.id));
        }

        if (estate.adminId) {
          await createNotification({
            userId: estate.adminId,
            title: `${BRAND_NAME} subscription — ${periodLabel(period)}`,
            body: `Your ${plan.label} plan invoice of KES ${plan.monthlyKes.toLocaleString("en-KE")} is ready. Pay via M-PESA from Estate Settings by ${dueDate.toLocaleDateString("en-KE", { day: "numeric", month: "short" })}.`,
            type: "billing",
            linkTo: "/admin/settings",
          });
        }
      } catch (err) {
        log.error({ event: "invoice_generation_row_failed", estateId: estate.id, err }, "invoice generation failed for one estate");
      }
    }
  } catch (err) {
    log.error({ event: "invoice_generation_failed", err }, "invoice generation job failed");
  }

  // ── One-time overdue nag ──────────────────────────────────────────────
  try {
    const overdue = await db
      .select({
        id: subscriptionInvoices.id,
        estateId: subscriptionInvoices.estateId,
        period: subscriptionInvoices.period,
        amount: subscriptionInvoices.amount,
      })
      .from(subscriptionInvoices)
      .where(
        and(
          eq(subscriptionInvoices.status, "pending"),
          lt(subscriptionInvoices.dueDate, now),
          isNull(subscriptionInvoices.overdueNotifiedAt),
        ),
      )
      .limit(100);

    for (const inv of overdue) {
      try {
        // Claim before notifying — same atomic pattern as event reminders.
        const claimed = await db
          .update(subscriptionInvoices)
          .set({ overdueNotifiedAt: now, updatedAt: now })
          .where(
            and(
              eq(subscriptionInvoices.id, inv.id),
              isNull(subscriptionInvoices.overdueNotifiedAt),
            ),
          )
          .returning({ id: subscriptionInvoices.id });
        if (claimed.length === 0) continue;

        const [estate] = await db
          .select({ name: estates.name, adminId: estates.adminId })
          .from(estates)
          .where(eq(estates.id, inv.estateId))
          .limit(1);
        if (!estate?.adminId) continue;

        const amountKes = Number(inv.amount).toLocaleString("en-KE");
        await createNotification({
          userId: estate.adminId,
          title: "Subscription payment overdue",
          body: `The ${periodLabel(inv.period)} invoice (KES ${amountKes}) is past due. Please pay via M-PESA from Estate Settings to keep ${estate.name} in good standing.`,
          type: "billing",
          linkTo: "/admin/settings",
        });

        const [admin] = await db
          .select({ phone: users.phone })
          .from(users)
          .where(and(eq(users.id, estate.adminId), isNull(users.deletedAt)))
          .limit(1);
        if (admin) {
          await sendThrottledSms({
            userId: estate.adminId,
            to: admin.phone,
            message: `${BRAND_NAME}: your ${periodLabel(inv.period)} subscription (KES ${amountKes}) for ${estate.name} is overdue. Open Estate Settings in the app to pay via M-PESA.`,
            systemMessage: true,
          });
        }
      } catch (err) {
        log.error({ event: "overdue_nag_row_failed", invoiceId: inv.id, err }, "overdue nag failed for one invoice");
      }
    }
  } catch (err) {
    log.error({ event: "overdue_nag_failed", err }, "overdue nag job failed");
  }
}
