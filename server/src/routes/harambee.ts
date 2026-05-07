import { Router } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db } from "../db.js";
import { fundraisingCampaigns, donations, users } from "@shared/schema.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { newId } from "../lib/ids.js";

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

  const { title, description, goalAmount, deadline } = req.body as {
    title: string;
    description?: string;
    goalAmount: number;
    deadline?: string;
  };

  if (!title?.trim()) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  if (!goalAmount || Number(goalAmount) < 1) {
    res.status(400).json({ error: "goalAmount is required and must be positive" });
    return;
  }

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

  res.status(201).json({ data: campaign });
});

// PATCH /:id — admin updates campaign status (active/completed/cancelled)
harambeeRouter.patch("/:id", requireRole("admin"), async (req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) {
    res.status(400).json({ error: "No estate assigned" });
    return;
  }

  const { status, title, description, goalAmount, deadline } = req.body as {
    status?: "active" | "completed" | "cancelled";
    title?: string;
    description?: string;
    goalAmount?: number;
    deadline?: string;
  };

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
  if (title?.trim()) updates.title = title.trim();
  if (description !== undefined) updates.description = description?.trim() ?? null;
  if (goalAmount !== undefined) updates.goalAmount = String(goalAmount);
  if (deadline !== undefined) updates.deadline = deadline ? new Date(deadline) : null;

  const [updated] = await db
    .update(fundraisingCampaigns)
    .set(updates)
    .where(eq(fundraisingCampaigns.id, campaign.id))
    .returning();

  res.json({ data: updated });
});

// POST /:id/donate — any user donates
harambeeRouter.post("/:id/donate", async (req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) {
    res.status(400).json({ error: "No estate assigned" });
    return;
  }

  const { amount, anonymous } = req.body as {
    amount: number;
    anonymous?: boolean;
  };

  if (!amount || Number(amount) < 1) {
    res.status(400).json({ error: "amount is required and must be positive" });
    return;
  }

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

  const [donation] = await db
    .insert(donations)
    .values({
      id: newId(),
      campaignId: campaign.id,
      donorId: user.id,
      amount: String(amount),
      anonymous: anonymous ?? false,
      mpesaRef: "STUB", // dev stub
    })
    .returning();

  // Update currentAmount on campaign
  await db
    .update(fundraisingCampaigns)
    .set({
      currentAmount: String(Number(campaign.currentAmount) + Number(amount)),
      updatedAt: new Date(),
    })
    .where(eq(fundraisingCampaigns.id, campaign.id));

  res.status(201).json({ data: donation });
});
