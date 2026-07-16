import { Router } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import { db, dbTx } from "../db.js";
import { payments, fundraisingCampaigns, donations, chamaContributions } from "@shared/schema.js";
import {
  initiatePaymentSchema,
  createCampaignSchema,
} from "@shared/validators.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { mpesaIpAllowlist } from "../middleware/mpesaIpAllowlist.js";
import { newId } from "../lib/ids.js";
import { stkPush, isMpesaConfigured } from "../lib/mpesa.js";
import { writeAudit } from "../lib/audit.js";

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
      await dbTx.transaction(async (tx) => {
        // Lock the payment row for the duration of this transaction so
        // concurrent retries from Safaricom serialize on it.
        const rows = await tx.execute<{
          id: string;
          estate_id: string;
          user_id: string;
          amount: string;
          type: string;
          status: string;
          metadata: Record<string, unknown> | null;
        }>(sql`
          SELECT id, estate_id, user_id, amount, type, status, metadata
            FROM payments
           WHERE checkout_request_id = ${CheckoutRequestID}
           FOR UPDATE
        `);
        const payment = rows[0];
        if (!payment) return;

        // Idempotency guard: if the payment already settled, do nothing.
        if (payment.status !== "pending") return;

        if (ResultCode !== 0) {
          await tx
            .update(payments)
            .set({ status: "failed", updatedAt: new Date() })
            .where(eq(payments.id, payment.id));
          return;
        }

        const items = CallbackMetadata?.Item ?? [];
        const get = (name: string) =>
          items.find((i) => i.Name === name)?.Value;
        const mpesaRef = String(get("MpesaReceiptNumber") ?? "");

        await tx
          .update(payments)
          .set({ status: "completed", mpesaRef, updatedAt: new Date() })
          .where(eq(payments.id, payment.id));

        // Create downstream records for harambee donations and chama contributions.
        if (payment.type === "harambee_donation") {
          const meta = payment.metadata ?? {};
          const campaignId = meta.campaignId as string | undefined;
          const anonymous = Boolean(meta.anonymous);
          if (campaignId) {
            await tx.insert(donations).values({
              id: newId(),
              campaignId,
              donorId: payment.user_id,
              amount: payment.amount,
              anonymous,
              mpesaRef,
            });
            await tx.execute(sql`
              UPDATE fundraising_campaigns
                 SET current_amount = current_amount + ${payment.amount}::numeric,
                     updated_at = NOW()
               WHERE id = ${campaignId}
            `);
          }
        } else if (payment.type === "chama_contribution") {
          const meta = payment.metadata ?? {};
          const chamaId = meta.chamaId as string | undefined;
          const periodLabel = String(meta.periodLabel ?? "");
          if (chamaId) {
            await tx.insert(chamaContributions).values({
              id: newId(),
              chamaId,
              userId: payment.user_id,
              amount: payment.amount,
              periodLabel,
              mpesaRef,
              paidAt: new Date(),
            });
          }
        }
      });
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
    if (process.env.NODE_ENV === "production") {
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
    void writeAudit(req, {
      action: "payment.initiated",
      targetType: "payment",
      targetId: id,
      metadata: { amount, type, stub: true },
    });
    res.json({ data: updated, stub: true });
    return;
  }

  try {
    const result = await stkPush({
      phone: payPhone,
      amount,
      accountRef: user.estateId.slice(0, 12),
      description: description ?? type,
    });
    await db
      .update(payments)
      .set({ checkoutRequestId: result.CheckoutRequestID, updatedAt: new Date() })
      .where(eq(payments.id, id));
    void writeAudit(req, {
      action: "payment.initiated",
      targetType: "payment",
      targetId: id,
      metadata: { amount, type },
    });
    res.json({ data: payment, message: result.CustomerMessage });
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
  }
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
