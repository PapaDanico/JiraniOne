import { Router } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import { db, dbTx } from "../db.js";
import { fundraisingCampaigns, donations, payments, users } from "@shared/schema.js";
import {
  createHarambeeSchema,
  updateHarambeeSchema,
  donateSchema,
} from "@shared/validators.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { newId } from "../lib/ids.js";
import { stkPush, isMpesaConfigured } from "../lib/mpesa.js";
import { writeAudit } from "../lib/audit.js";
import { logger } from "../lib/logger.js";
import { isProduction } from "../lib/env.js";

const log = logger.child({ component: "harambee" });

export const harambeeRouter = Router();
harambeeRouter.use(requireAuth);

// GET / — list campaigns for estate
harambeeRouter.get("/", async (_req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) { res.json({ data: [] }); return; }

  const rows = await db
    .select()
    .from(fundraisingCampaigns)
    .where(eq(fundraisingCampaigns.estateId, user.estateId))
    .orderBy(desc(fundraisingCampaigns.createdAt));

  res.json({ data: rows });
});

// GET /:id/donations — list donations for a campaign (with donor names unless anonymous)
harambeeRouter.get("/:id/donations", async (req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) { res.json({ data: [] }); return; }

  const [campaign] = await db
    .select()
    .from(fundraisingCampaigns)
    .where(
      and(
        eq(fundraisingCampaigns.id, req.params.id!),
        eq(fundraisingCampaigns.estateId, user.estateId),
      ),
    )
    .limit(1);

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  const rows = await db
    .select({
      id: donations.id,
      campaignId: donations.campaignId,
      donorId: donations.donorId,
      amount: donations.amount,
      mpesaRef: donations.mpesaRef,
      anonymous: donations.anonymous,
      createdAt: donations.createdAt,
      donorName: users.name,
    })
    .from(donations)
    .leftJoin(users, eq(donations.donorId, users.id))
    .where(eq(donations.campaignId, campaign.id))
    .orderBy(desc(donations.createdAt));

  // Mask donor name for anonymous donations
  const sanitized = rows.map((row) => ({
    ...row,
    donorName: row.anonymous ? null : row.donorName,
    donorId: row.anonymous ? null : row.donorId,
  }));

  res.json({ data: sanitized });
});

// POST / — admin creates campaign
harambeeRouter.post("/", requireRole("admin"), async (req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) {
    res.status(400).json({ error: "No estate assigned" });
    return;
  }

  const parsed = createHarambeeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { title, description, goalAmount, deadline } = parsed.data;

  const [campaign] = await db
    .insert(fundraisingCampaigns)
    .values({
      id: newId(),
      estateId: user.estateId,
      createdById: user.id,
      title: title.trim(),
      description: description?.trim() ?? null,
      goalAmount: String(goalAmount),
      deadline: deadline ? new Date(deadline) : null,
      status: "active",
    })
    .returning();

  void writeAudit(req, {
    action: "harambee.created",
    targetType: "fundraising_campaign",
    targetId: campaign!.id,
    metadata: { title: campaign!.title, goalAmount },
  });

  res.status(201).json({ data: campaign });
});

// PATCH /:id — admin updates campaign status (active/completed/cancelled)
harambeeRouter.patch("/:id", requireRole("admin"), async (req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) {
    res.status(400).json({ error: "No estate assigned" });
    return;
  }

  const parsed = updateHarambeeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { status, title, description, goalAmount, deadline } = parsed.data;

  const [campaign] = await db
    .select()
    .from(fundraisingCampaigns)
    .where(
      and(
        eq(fundraisingCampaigns.id, req.params.id!),
        eq(fundraisingCampaigns.estateId, user.estateId),
      ),
    )
    .limit(1);

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  const updates: Partial<typeof campaign> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };
  if (status) updates.status = status;
  if (title !== undefined && title.trim()) updates.title = title.trim();
  if (description !== undefined) updates.description = description?.trim() ?? null;
  if (goalAmount !== undefined) updates.goalAmount = String(goalAmount);
  if (deadline !== undefined) updates.deadline = deadline ? new Date(deadline) : null;

  const [updated] = await db
    .update(fundraisingCampaigns)
    .set(updates)
    .where(eq(fundraisingCampaigns.id, campaign.id))
    .returning();

  void writeAudit(req, {
    action: "harambee.updated",
    targetType: "fundraising_campaign",
    targetId: campaign.id,
    metadata: { previousStatus: campaign.status, newStatus: updated!.status },
  });

  res.json({ data: updated });
});

// POST /:id/donate — initiate M-PESA STK Push. The donation record is created
// only when the callback returns ResultCode === 0, preventing phantom donations
// for cancelled/failed pushes. In dev (no M-PESA config) a DEV_STUB payment
// is created and the donation credited immediately.
harambeeRouter.post("/:id/donate", async (req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) {
    res.status(400).json({ error: "No estate assigned" });
    return;
  }

  const parsed = donateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { amount, anonymous } = parsed.data;

  const [campaign] = await db
    .select()
    .from(fundraisingCampaigns)
    .where(
      and(
        eq(fundraisingCampaigns.id, req.params.id!),
        eq(fundraisingCampaigns.estateId, user.estateId),
      ),
    )
    .limit(1);

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  if (campaign.status !== "active") {
    res.status(400).json({ error: "Campaign is not accepting donations" });
    return;
  }

  const paymentId = newId();
  const [payment] = await db
    .insert(payments)
    .values({
      id: paymentId,
      userId: user.id,
      estateId: user.estateId,
      amount: String(amount),
      phoneUsed: user.phone,
      type: "harambee_donation",
      status: "pending",
      description: `Harambee: ${campaign.title}`,
      metadata: { campaignId: campaign.id, anonymous },
    })
    .returning();

  if (!isMpesaConfigured()) {
    // Dev stub only — never in production (see payments.ts /stk-push for
    // why: a missing Daraja env var must fail loudly, not silently
    // auto-complete a real donation for free).
    if (isProduction()) {
      await db
        .update(payments)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(payments.id, paymentId));
      res.status(503).json({ error: "Payments are temporarily unavailable. Please try again shortly." });
      return;
    }

    // Dev stub: credit immediately without waiting for a real callback.
    await db
      .update(payments)
      .set({ status: "completed", mpesaRef: "DEV_STUB", updatedAt: new Date() })
      .where(eq(payments.id, paymentId));

    const donation = await dbTx.transaction(async (tx) => {
      const [d] = await tx
        .insert(donations)
        .values({
          id: newId(),
          campaignId: campaign.id,
          donorId: user.id,
          amount: String(amount),
          anonymous,
          mpesaRef: "DEV_STUB",
        })
        .returning();
      await tx
        .update(fundraisingCampaigns)
        .set({
          currentAmount: sql`${fundraisingCampaigns.currentAmount} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(fundraisingCampaigns.id, campaign.id));
      return d;
    });

    void writeAudit(req, {
      action: "harambee.donated",
      targetType: "fundraising_campaign",
      targetId: campaign.id,
      metadata: { amount, anonymous, donationId: donation!.id, stub: true },
    });

    res.status(201).json({ data: { payment: payment!, donation, stub: true } });
    return;
  }

  try {
    const result = await stkPush({
      phone: user.phone,
      amount,
      accountRef: campaign.id.slice(0, 12),
      description: `Harambee donation`,
    });
    await db
      .update(payments)
      .set({ checkoutRequestId: result.CheckoutRequestID, updatedAt: new Date() })
      .where(eq(payments.id, paymentId));

    void writeAudit(req, {
      action: "harambee.donate_initiated",
      targetType: "fundraising_campaign",
      targetId: campaign.id,
      metadata: { amount, anonymous, paymentId },
    });

    res.json({ data: { payment: payment!, message: result.CustomerMessage } });
  } catch (err) {
    log.error(
      { event: "harambee_stk_push_failed", paymentId, campaignId: campaign.id, err },
      "STK push failed for harambee donation",
    );
    await db
      .update(payments)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(payments.id, paymentId));
    res.status(502).json({ error: "STK Push failed — please try again" });
  }
});
