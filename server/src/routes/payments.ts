import { Router } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db } from "../db.js";
import { payments, fundraisingCampaigns, donations } from "@shared/schema.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { newId } from "../lib/ids.js";
import { stkPush, isMpesaConfigured } from "../lib/mpesa.js";
import { broadcastToEstate } from "../ws.js";

export const paymentsRouter = Router();
paymentsRouter.use(requireAuth);

// Resident: initiate M-PESA STK Push
paymentsRouter.post("/stk-push", async (req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) { res.status(400).json({ error: "No estate assigned" }); return; }

  const { amount, type, description, phone } = req.body as {
    amount: number; type: string; description?: string; phone?: string;
  };

  if (!amount || amount < 1 || !type) {
    res.status(400).json({ error: "amount and type are required" });
    return;
  }

  const payPhone = phone ?? user.phone;
  const id = newId();

  const [payment] = await db.insert(payments).values({
    id,
    userId: user.id,
    estateId: user.estateId,
    amount: String(amount),
    phoneUsed: payPhone,
    type,
    status: "pending",
    description: description ?? null,
  }).returning();

  if (!isMpesaConfigured()) {
    // Dev stub: mark as completed immediately
    const [updated] = await db.update(payments)
      .set({ status: "completed", mpesaRef: "DEV_STUB", updatedAt: new Date() })
      .where(eq(payments.id, id))
      .returning();
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
    await db.update(payments)
      .set({ checkoutRequestId: result.CheckoutRequestID, updatedAt: new Date() })
      .where(eq(payments.id, id));
    res.json({ data: payment, message: result.CustomerMessage });
  } catch {
    await db.update(payments).set({ status: "failed", updatedAt: new Date() }).where(eq(payments.id, id));
    res.status(502).json({ error: "STK Push failed — please try again" });
  }
});

// M-PESA callback (no auth — called by Safaricom)
paymentsRouter.post("/mpesa/callback", async (req, res) => {
  const callback = req.body?.Body?.stkCallback;
  if (!callback) { res.json({ ResultCode: 0 }); return; }

  const { CheckoutRequestID, ResultCode, CallbackMetadata } = callback as {
    CheckoutRequestID: string;
    ResultCode: number;
    CallbackMetadata?: { Item: { Name: string; Value: unknown }[] };
  };

  const [payment] = await db.select().from(payments)
    .where(eq(payments.checkoutRequestId, CheckoutRequestID)).limit(1);

  if (!payment) { res.json({ ResultCode: 0 }); return; }

  if (ResultCode !== 0) {
    await db.update(payments).set({ status: "failed", updatedAt: new Date() })
      .where(eq(payments.id, payment.id));
  } else {
    const items = CallbackMetadata?.Item ?? [];
    const get = (name: string) => items.find((i) => i.Name === name)?.Value;
    const mpesaRef = String(get("MpesaReceiptNumber") ?? "");
    await db.update(payments)
      .set({ status: "completed", mpesaRef, updatedAt: new Date() })
      .where(eq(payments.id, payment.id));
    broadcastToEstate(payment.estateId, {
      type: "payment:confirmed",
      payload: { ...payment, status: "completed", mpesaRef },
      estateId: payment.estateId,
    });
  }

  res.json({ ResultCode: 0 });
});

// Resident: my payment history
paymentsRouter.get("/my", async (_req, res) => {
  const user = res.locals.user!;
  const rows = await db.select().from(payments)
    .where(eq(payments.userId, user.id))
    .orderBy(desc(payments.createdAt))
    .limit(50);
  res.json({ data: rows });
});

// Admin: all estate payments
paymentsRouter.get("/estate", requireRole("admin"), async (_req, res) => {
  const user = res.locals.user!;
  const rows = await db.select().from(payments)
    .where(eq(payments.estateId, user.estateId!))
    .orderBy(desc(payments.createdAt))
    .limit(200);
  res.json({ data: rows });
});

// Admin: list fundraising campaigns
paymentsRouter.get("/campaigns", async (_req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) { res.json({ data: [] }); return; }
  const rows = await db.select().from(fundraisingCampaigns)
    .where(eq(fundraisingCampaigns.estateId, user.estateId))
    .orderBy(desc(fundraisingCampaigns.createdAt));
  res.json({ data: rows });
});

// Admin: create campaign
paymentsRouter.post("/campaigns", requireRole("admin"), async (req, res) => {
  const user = res.locals.user!;
  const { title, description, goalAmount, deadline } = req.body as {
    title: string; description?: string; goalAmount: number; deadline?: string;
  };
  if (!title || !goalAmount) { res.status(400).json({ error: "title and goalAmount required" }); return; }

  const [row] = await db.insert(fundraisingCampaigns).values({
    id: newId(),
    estateId: user.estateId!,
    createdById: user.id,
    title,
    description: description ?? null,
    goalAmount: String(goalAmount),
    deadline: deadline ? new Date(deadline) : null,
  }).returning();
  res.status(201).json({ data: row });
});

// Any authenticated: donate to campaign
paymentsRouter.post("/campaigns/:id/donate", async (req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) { res.status(400).json({ error: "No estate assigned" }); return; }

  const { amount, anonymous } = req.body as { amount: number; anonymous?: boolean };
  if (!amount || amount < 1) { res.status(400).json({ error: "amount required" }); return; }

  const [campaign] = await db.select().from(fundraisingCampaigns)
    .where(and(
      eq(fundraisingCampaigns.id, req.params['id']!),
      eq(fundraisingCampaigns.estateId, user.estateId),
    )).limit(1);

  if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }

  const [donation] = await db.insert(donations).values({
    id: newId(),
    campaignId: campaign.id,
    donorId: user.id,
    amount: String(amount),
    anonymous: anonymous ?? false,
  }).returning();

  // Update campaign total
  await db.update(fundraisingCampaigns)
    .set({
      currentAmount: String(Number(campaign.currentAmount) + amount),
      updatedAt: new Date(),
    })
    .where(eq(fundraisingCampaigns.id, campaign.id));

  res.status(201).json({ data: donation });
});
