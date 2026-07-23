import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../db.js";
import { estates, payments, subscriptionInvoices } from "@shared/schema.js";
import { PLANS, tierForUnits, TRIAL_DAYS } from "@shared/billing.js";
import { kenyanPhone } from "@shared/validators.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { newId } from "../lib/ids.js";
import { getBillingSnapshot } from "../lib/billing.js";
import { stkPush, isMpesaConfigured } from "../lib/mpesa.js";
import { persistCheckoutRequestId } from "../lib/paymentBookkeeping.js";
import { settlePaymentById } from "./payments.js";
import { writeAudit } from "../lib/audit.js";
import { isProduction } from "../lib/env.js";

// Platform subscription billing — the estate paying JiraniOne, admin-only.
// Deliberately a separate router from resident payments: different payer,
// different money, different failure modes.
export const billingRouter = Router();
billingRouter.use(requireAuth, requireRole("admin"));

// Current plan, derived billing state, and invoice history.
billingRouter.get("/", async (_req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) {
    res.status(400).json({ error: "No estate on this account" });
    return;
  }

  const [estate] = await db
    .select({
      totalUnits: estates.totalUnits,
      billingExempt: estates.billingExempt,
      trialEndsAt: estates.trialEndsAt,
    })
    .from(estates)
    .where(eq(estates.id, user.estateId))
    .limit(1);
  if (!estate) {
    res.status(404).json({ error: "Estate not found" });
    return;
  }

  const snapshot = await getBillingSnapshot(user.estateId);
  const tier = tierForUnits(estate.totalUnits);
  const plan = PLANS[tier];

  const invoices = await db
    .select()
    .from(subscriptionInvoices)
    .where(eq(subscriptionInvoices.estateId, user.estateId))
    .orderBy(desc(subscriptionInvoices.period))
    .limit(12);

  res.json({
    data: {
      plan: {
        tier: plan.tier,
        label: plan.label,
        monthlyKes: plan.monthlyKes,
        blurb: plan.blurb,
      },
      state: snapshot?.state ?? "active",
      trialEndsAt: estate.trialEndsAt,
      trialDays: TRIAL_DAYS,
      currentInvoice: snapshot?.oldestUnpaid ?? null,
      invoices,
    },
  });
});

// Pay the oldest unpaid invoice via M-PESA STK push to the admin's phone
// (or an override phone — treasurers often pay from the estate's own line).
billingRouter.post("/pay", async (req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) {
    res.status(400).json({ error: "No estate on this account" });
    return;
  }

  let payPhone = user.phone as string;
  if (req.body?.phone !== undefined) {
    const parsed = kenyanPhone.safeParse(req.body.phone);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid phone number" });
      return;
    }
    payPhone = parsed.data;
  }

  const snapshot = await getBillingSnapshot(user.estateId);
  const invoice = snapshot?.oldestUnpaid;
  if (!invoice) {
    res.status(409).json({ error: "No unpaid invoice — you're all settled." });
    return;
  }

  const paymentId = newId();
  await db.insert(payments).values({
    id: paymentId,
    userId: user.id,
    estateId: user.estateId,
    amount: invoice.amount,
    phoneUsed: payPhone,
    type: "subscription",
    status: "pending",
    description: `${PLANS[invoice.tier].label} plan — ${invoice.period}`,
    metadata: { invoiceId: invoice.id },
  });

  if (!isMpesaConfigured()) {
    // Same "never silently succeed in production" guard as the resident
    // payment path — a botched Daraja secret rotation must not comp a
    // month of subscription revenue.
    if (isProduction()) {
      await db
        .update(payments)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(payments.id, paymentId));
      res.status(503).json({ error: "Payments are temporarily unavailable. Please try again shortly." });
      return;
    }

    // Dev stub — settle through the shared path so the invoice actually
    // flips to paid, exercising the same code the M-PESA callback runs.
    await settlePaymentById(paymentId, { success: true, mpesaRef: "DEV_STUB" });
    await writeAudit(req, {
      action: "billing.payment_initiated",
      targetType: "subscription_invoice",
      targetId: invoice.id,
      metadata: { amount: invoice.amount, period: invoice.period, stub: true },
    });
    res.json({ data: { paymentId, stub: true } });
    return;
  }

  let result;
  try {
    result = await stkPush({
      phone: payPhone,
      amount: Number(invoice.amount),
      accountRef: `SUB-${invoice.period}`,
      description: "Subscription",
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "billing_stk_push_failed",
        paymentId,
        invoiceId: invoice.id,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    await db
      .update(payments)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(payments.id, paymentId));
    res.status(502).json({ error: "STK Push failed — please try again" });
    return;
  }

  const persisted = await persistCheckoutRequestId(paymentId, result.CheckoutRequestID);
  if (!persisted) {
    console.error(
      JSON.stringify({
        event: "payment_orphaned_needs_reconciliation",
        paymentId,
        checkoutRequestId: result.CheckoutRequestID,
      }),
    );
  }
  await writeAudit(req, {
    action: "billing.payment_initiated",
    targetType: "subscription_invoice",
    targetId: invoice.id,
    metadata: { amount: invoice.amount, period: invoice.period },
  });
  res.json({ data: { paymentId }, message: result.CustomerMessage });
});
