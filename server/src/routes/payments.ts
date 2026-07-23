import { Router } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import { db, dbTx, type DBTx } from "../db.js";
import { payments, fundraisingCampaigns, donations, chamaContributions, subscriptionInvoices, users } from "@shared/schema.js";
import { periodLabel } from "@shared/billing.js";
import { BRAND_NAME } from "@shared/brand.js";
import { createNotification } from "../lib/notify.js";
import { sendThrottledSms } from "../lib/sms.js";
import {
  initiatePaymentSchema,
  createCampaignSchema,
} from "@shared/validators.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { mpesaIpAllowlist } from "../middleware/mpesaIpAllowlist.js";
import { newId } from "../lib/ids.js";
import { stkPush, isMpesaConfigured } from "../lib/mpesa.js";
import { persistCheckoutRequestId } from "../lib/paymentBookkeeping.js";
import { writeAudit } from "../lib/audit.js";
import { isProduction } from "../lib/env.js";

// Shared by the public M-PESA callback handler below AND the reconciliation
// cron job (server/src/cron.ts) — both settle a pending payment the same
// way, so the downstream donation/contribution insert + campaign-total
// increment can't drift between the two paths (a prior version of the cron
// job only flipped payments.status, silently dropping the donation/
// contribution row and the campaign total credit whenever a callback was
// lost). Caller must run this inside a transaction with the payment row
// already locked FOR UPDATE, or use settlePaymentById below.
//
// Returns an optional post-commit action (receipt notification/SMS). It
// MUST be invoked by the caller only AFTER the transaction commits — a
// receipt sent from inside the transaction could confirm a payment whose
// settlement then rolls back.
export type PostSettleAction = () => Promise<void>;

export async function applyPaymentResult(
  tx: DBTx,
  payment: {
    id: string;
    user_id: string;
    amount: string;
    type: string;
    status: string;
    metadata: Record<string, unknown> | null;
  },
  result: { success: boolean; mpesaRef: string | null },
): Promise<PostSettleAction | undefined> {
  // Idempotency guard: if the payment already settled, do nothing.
  if (payment.status !== "pending") return;

  if (!result.success) {
    await tx
      .update(payments)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(payments.id, payment.id));
    return;
  }

  await tx
    .update(payments)
    .set({
      status: "completed",
      mpesaRef: result.mpesaRef ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, payment.id));

  // Create downstream records for harambee donations and chama contributions.
  if (payment.type === "harambee_donation") {
    const meta = payment.metadata ?? {};
    const campaignId = meta.campaignId as string | undefined;
    const anonymous = Boolean(meta.anonymous);
    if (campaignId) {
      // The donation record is an accounting fact (this M-PESA charge
      // happened) regardless of the campaign's current state, so it's
      // always inserted. But the STK push may have been initiated before an
      // admin closed the campaign and only settled after — crediting a
      // closed campaign's total would misrepresent its final amount, so
      // only increment current_amount if it's still active, and flag the
      // mismatch for manual review otherwise.
      await tx.insert(donations).values({
        id: newId(),
        campaignId,
        donorId: payment.user_id,
        amount: payment.amount,
        anonymous,
        mpesaRef: result.mpesaRef,
      });
      const updated = await tx.execute(sql`
        UPDATE fundraising_campaigns
           SET current_amount = current_amount + ${payment.amount}::numeric,
               updated_at = NOW()
         WHERE id = ${campaignId} AND status = 'active'
         RETURNING id
      `);
      if (updated.length === 0) {
        console.error(
          JSON.stringify({
            event: "donation_settled_after_campaign_closed",
            paymentId: payment.id,
            campaignId,
            amount: payment.amount,
          }),
        );
      }
    }
  } else if (payment.type === "subscription") {
    // Platform subscription invoice (server/src/routes/billing.ts). Flip
    // the linked invoice to paid — guarded on status so a duplicate
    // callback or a reconciliation re-settle is a no-op, and so a payment
    // arriving after an admin already paid via another channel (invoice
    // manually waived, second device) can't double-mark.
    const meta = payment.metadata ?? {};
    const invoiceId = meta.invoiceId as string | undefined;
    if (invoiceId) {
      const updated = await tx
        .update(subscriptionInvoices)
        .set({
          status: "paid",
          paymentId: payment.id,
          mpesaRef: result.mpesaRef,
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(subscriptionInvoices.id, invoiceId),
          eq(subscriptionInvoices.status, "pending"),
        ))
        .returning({ id: subscriptionInvoices.id, period: subscriptionInvoices.period });
      if (updated.length === 0) {
        // Real money arrived for an invoice that's no longer pending —
        // needs a human decision (refund vs credit), never silent.
        console.error(
          JSON.stringify({
            event: "subscription_paid_but_invoice_not_pending",
            paymentId: payment.id,
            invoiceId,
            amount: payment.amount,
          }),
        );
      } else {
        // Receipt — this is the moment a paying estate judges whether the
        // billing is trustworthy. Runs post-commit (see settlePaymentById /
        // the callback handler), best-effort: a receipt failure never
        // un-settles a payment.
        const period = updated[0]!.period;
        const amountKes = Number(payment.amount).toLocaleString("en-KE");
        const refLine = result.mpesaRef ? ` M-PESA ref ${result.mpesaRef}.` : "";
        return async () => {
          try {
            await createNotification({
              userId: payment.user_id,
              title: "Subscription payment received",
              body: `KES ${amountKes} received for ${periodLabel(period)}. Your estate is in good standing.${refLine} Thank you!`,
              type: "billing",
              linkTo: "/admin/settings",
            });
            const [payer] = await db
              .select({ phone: users.phone })
              .from(users)
              .where(eq(users.id, payment.user_id))
              .limit(1);
            if (payer) {
              await sendThrottledSms({
                userId: payment.user_id,
                to: payer.phone,
                message: `${BRAND_NAME}: payment of KES ${amountKes} received for your ${periodLabel(period)} subscription.${refLine} Asante!`,
                systemMessage: true,
              });
            }
          } catch (err) {
            console.error(
              JSON.stringify({
                event: "subscription_receipt_failed",
                paymentId: payment.id,
                error: err instanceof Error ? err.message : String(err),
              }),
            );
          }
        };
      }
    }
  } else if (payment.type === "chama_contribution") {
    const meta = payment.metadata ?? {};
    const chamaId = meta.chamaId as string | undefined;
    const periodLabel = String(meta.periodLabel ?? "");
    if (chamaId) {
      try {
        // Nested transaction (savepoint) — if this insert hits the
        // (chamaId, userId, periodLabel) unique index, only THIS statement
        // must roll back. The payment.status = "completed" update above
        // already reflects a real M-PESA charge and must still commit even
        // if the resident somehow ends up with two completed payments for
        // the same period (flagged below for manual reconciliation, not
        // silently dropped).
        await tx.transaction(async (tx2) => {
          await tx2.insert(chamaContributions).values({
            id: newId(),
            chamaId,
            userId: payment.user_id,
            amount: payment.amount,
            periodLabel,
            mpesaRef: result.mpesaRef,
            paidAt: new Date(),
          });
        });
      } catch (err) {
        console.error(
          JSON.stringify({
            event: "duplicate_period_contribution_needs_review",
            paymentId: payment.id,
            chamaId,
            userId: payment.user_id,
            periodLabel,
            error: err instanceof Error ? err.message : String(err),
          }),
        );
      }
    }
  }
}

// Locks the payment row, applies the result via applyPaymentResult, commits.
// Used by the reconciliation cron job, which (unlike the webhook) doesn't
// already hold a lock from an inbound callback request.
export async function settlePaymentById(
  paymentId: string,
  result: { success: boolean; mpesaRef: string | null },
): Promise<void> {
  let afterCommit: PostSettleAction | undefined;
  await dbTx.transaction(async (tx) => {
    const rows = await tx.execute<{
      id: string;
      user_id: string;
      amount: string;
      type: string;
      status: string;
      metadata: Record<string, unknown> | null;
    }>(sql`
      SELECT id, user_id, amount, type, status, metadata
        FROM payments
       WHERE id = ${paymentId}
       FOR UPDATE
    `);
    const payment = rows[0];
    if (!payment) return;
    afterCommit = await applyPaymentResult(tx, payment, result);
  });
  if (afterCommit) await afterCommit();
}

// ─── Public M-PESA callback router ───────────────────────────────────────────
// Mounted at /api/payments/mpesa/callback BEFORE requireAuth — Safaricom does
// not authenticate when calling us back. IP-allowlisted to Safaricom egress.
// Idempotent: a duplicate callback for the same CheckoutRequestID is a no-op.
export const mpesaCallbackRouter = Router();

mpesaCallbackRouter.post(
  "/mpesa/callback",
  mpesaIpAllowlist,
  async (req, res) => {
    // Always answer 200 within ~10s — Safaricom retries otherwise.
    // Do the heavy lifting in a transaction below.
    const callback = req.body?.Body?.stkCallback;
    if (!callback) {
      res.json({ ResultCode: 0 });
      return;
    }

    const { CheckoutRequestID, ResultCode, CallbackMetadata } = callback as {
      CheckoutRequestID: string;
      ResultCode: number;
      CallbackMetadata?: { Item: { Name: string; Value: unknown }[] };
    };

    try {
      let afterCommit: PostSettleAction | undefined;
      await dbTx.transaction(async (tx) => {
        // Lock the payment row for the duration of this transaction so
        // concurrent retries from Safaricom serialize on it.
        const rows = await tx.execute<{
          id: string;
          user_id: string;
          amount: string;
          type: string;
          status: string;
          metadata: Record<string, unknown> | null;
        }>(sql`
          SELECT id, user_id, amount, type, status, metadata
            FROM payments
           WHERE checkout_request_id = ${CheckoutRequestID}
           FOR UPDATE
        `);
        const payment = rows[0];
        if (!payment) return;

        if (ResultCode !== 0) {
          await applyPaymentResult(tx, payment, { success: false, mpesaRef: null });
          return;
        }

        const items = CallbackMetadata?.Item ?? [];
        const get = (name: string) =>
          items.find((i) => i.Name === name)?.Value;
        const mpesaRef = String(get("MpesaReceiptNumber") ?? "");

        afterCommit = await applyPaymentResult(tx, payment, { success: true, mpesaRef });
      });
      // Post-commit receipt — awaited (not fire-and-forget) because a
      // serverless function can be frozen right after the response; the
      // callback ack below only goes out after this completes, still well
      // inside Safaricom's timeout.
      if (afterCommit) await afterCommit();
    } catch (err) {
      // A unique-violation here means a concurrent callback already settled.
      // That is the desired idempotent outcome — log and ack.
      console.warn(
        JSON.stringify({
          event: "mpesa_callback_handler_error",
          checkoutRequestId: CheckoutRequestID,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }

    // Always ack so Safaricom does not retry indefinitely.
    res.json({ ResultCode: 0 });
  },
);

// ─── Authenticated payments router ───────────────────────────────────────────
export const paymentsRouter = Router();
paymentsRouter.use(requireAuth);

// Resident: initiate M-PESA STK Push
paymentsRouter.post("/stk-push", async (req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) {
    res.status(400).json({ error: "No estate assigned" });
    return;
  }

  const parsed = initiatePaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { amount, type, description, phone } = parsed.data;

  const payPhone = phone ?? user.phone;
  const id = newId();

  const [payment] = await db
    .insert(payments)
    .values({
      id,
      userId: user.id,
      estateId: user.estateId,
      amount: String(amount),
      phoneUsed: payPhone,
      type,
      status: "pending",
      description: description ?? null,
    })
    .returning();

  if (!isMpesaConfigured()) {
    // Dev stub only. Gated on NODE_ENV, not just missing config — an unset
    // Daraja env var in production (typo, botched secret rotation) must
    // never silently auto-complete a real resident's payment for free.
    if (isProduction()) {
      await db
        .update(payments)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(payments.id, id));
      res.status(503).json({ error: "Payments are temporarily unavailable. Please try again shortly." });
      return;
    }

    // Dev stub: leave mpesaRef NULL (the partial unique index ignores nulls)
    // and mark completed immediately so dev flows continue to work.
    const [updated] = await db
      .update(payments)
      .set({ status: "completed", mpesaRef: "DEV_STUB", updatedAt: new Date() })
      .where(eq(payments.id, id))
      .returning();
    // Awaited, not fire-and-forget — this is the audit trail for real
    // money movement, and a serverless function can be frozen the instant
    // after the response is sent, silently dropping an in-flight insert.
    await writeAudit(req, {
      action: "payment.initiated",
      targetType: "payment",
      targetId: id,
      metadata: { amount, type, stub: true },
    });
    res.json({ data: updated, stub: true });
    return;
  }

  let result;
  try {
    result = await stkPush({
      phone: payPhone,
      amount,
      accountRef: user.estateId.slice(0, 12),
      description: description ?? type,
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "stk_push_failed",
        paymentId: id,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    await db
      .update(payments)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(payments.id, id));
    res.status(502).json({ error: "STK Push failed — please try again" });
    return;
  }

  // Safaricom has already accepted the push at this point — the resident
  // may be charged regardless of what happens next. A failure persisting
  // checkoutRequestId is NOT a payment failure and must never be reported
  // or recorded as one (see persistCheckoutRequestId's comment).
  const persisted = await persistCheckoutRequestId(id, result.CheckoutRequestID);
  if (!persisted) {
    console.error(
      JSON.stringify({
        event: "payment_orphaned_needs_reconciliation",
        paymentId: id,
        checkoutRequestId: result.CheckoutRequestID,
      }),
    );
  }
  // Awaited — see the dev-stub branch above for why.
  await writeAudit(req, {
    action: "payment.initiated",
    targetType: "payment",
    targetId: id,
    metadata: { amount, type },
  });
  res.json({ data: payment, message: result.CustomerMessage });
});

// Resident: my payment history
paymentsRouter.get("/my", async (_req, res) => {
  const user = res.locals.user!;
  const rows = await db
    .select()
    .from(payments)
    .where(eq(payments.userId, user.id))
    .orderBy(desc(payments.createdAt))
    .limit(50);
  res.json({ data: rows });
});

// Admin: all estate payments
paymentsRouter.get("/estate", requireRole("admin"), async (_req, res) => {
  const user = res.locals.user!;
  const rows = await db
    .select()
    .from(payments)
    .where(eq(payments.estateId, user.estateId!))
    .orderBy(desc(payments.createdAt))
    .limit(200);
  res.json({ data: rows });
});

// List fundraising campaigns
paymentsRouter.get("/campaigns", async (_req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) {
    res.json({ data: [] });
    return;
  }
  const rows = await db
    .select()
    .from(fundraisingCampaigns)
    .where(eq(fundraisingCampaigns.estateId, user.estateId))
    .orderBy(desc(fundraisingCampaigns.createdAt));
  res.json({ data: rows });
});

// Admin: create campaign
paymentsRouter.post("/campaigns", requireRole("admin"), async (req, res) => {
  const user = res.locals.user!;
  const parsed = createCampaignSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { title, description, goalAmount, deadline } = parsed.data;

  const [row] = await db
    .insert(fundraisingCampaigns)
    .values({
      id: newId(),
      estateId: user.estateId!,
      createdById: user.id,
      title,
      description: description ?? null,
      goalAmount: String(goalAmount),
      deadline: deadline ? new Date(deadline) : null,
    })
    .returning();
  void writeAudit(req, {
    action: "campaign.created",
    targetType: "fundraising_campaign",
    targetId: row!.id,
    metadata: { title, goalAmount },
  });
  res.status(201).json({ data: row });
});

// Donations are only ever recorded after a real M-PESA payment settles —
// see harambeeRouter's POST /:id/donate (initiates STK push; the donation
// row + campaign total increment happen in the callback handler above once
// ResultCode === 0). A direct "donate" endpoint here previously let any
// authenticated resident credit arbitrary amounts with no payment collected
// at all — removed as a critical financial integrity bug, not reimplemented.
