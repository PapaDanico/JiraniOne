import { Router } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "../db.js";
import { chamas, chamaMembers, chamaContributions, users } from "@shared/schema.js";
import {
  createChamaSchema,
  chamaContributeSchema,
} from "@shared/validators.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { newId } from "../lib/ids.js";

export const chamaRouter = Router();
chamaRouter.use(requireAuth);

// GET / — list chamas for the estate (include memberCount, include myMembership)
chamaRouter.get("/", async (_req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) { res.json({ data: [] }); return; }

  const rows = await db
    .select()
    .from(chamas)
    .where(eq(chamas.estateId, user.estateId))
    .orderBy(desc(chamas.createdAt));

  if (rows.length === 0) {
    res.json({ data: [] });
    return;
  }

  const chamaIds = rows.map((c) => c.id);

  // Fetch all memberships for these chamas
  const allMembers = await db
    .select()
    .from(chamaMembers)
    .where(sql`${chamaMembers.chamaId} = ANY(${chamaIds})`);

  const countByChamaId = new Map<string, number>();
  const myMembershipByChamaId = new Map<string, typeof allMembers[number]>();

  for (const m of allMembers) {
    countByChamaId.set(m.chamaId, (countByChamaId.get(m.chamaId) ?? 0) + 1);
    if (m.userId === user.id) {
      myMembershipByChamaId.set(m.chamaId, m);
    }
  }

  const data = rows.map((chama) => ({
    ...chama,
    memberCount: countByChamaId.get(chama.id) ?? 0,
    myMembership: myMembershipByChamaId.get(chama.id) ?? null,
  }));

  res.json({ data });
});

// POST / — any resident creates a chama; creator is auto-added as admin member
chamaRouter.post("/", async (req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) {
    res.status(400).json({ error: "No estate assigned" });
    return;
  }

  const parsed = createChamaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { name, description, contributionAmount, frequency } = parsed.data;

  const chamaId = newId();

  const [chama] = await db
    .insert(chamas)
    .values({
      id: chamaId,
      estateId: user.estateId,
      adminId: user.id,
      name: name.trim(),
      description: description?.trim() ?? null,
      contributionAmount: String(contributionAmount),
      frequency,
      status: "active",
    })
    .returning();

  // Auto-add creator as admin member
  await db.insert(chamaMembers).values({
    id: newId(),
    chamaId,
    userId: user.id,
    role: "admin",
  });

  res.status(201).json({ data: chama });
});

// POST /:id/join — resident joins a chama
chamaRouter.post("/:id/join", async (req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) {
    res.status(400).json({ error: "No estate assigned" });
    return;
  }

  const [chama] = await db
    .select()
    .from(chamas)
    .where(
      and(
        eq(chamas.id, req.params.id!),
        eq(chamas.estateId, user.estateId),
      ),
    )
    .limit(1);

  if (!chama) {
    res.status(404).json({ error: "Chama not found" });
    return;
  }
  if (chama.status !== "active") {
    res.status(400).json({ error: "Chama is not accepting new members" });
    return;
  }

  // Check existing membership
  const [existing] = await db
    .select()
    .from(chamaMembers)
    .where(
      and(
        eq(chamaMembers.chamaId, chama.id),
        eq(chamaMembers.userId, user.id),
      ),
    )
    .limit(1);

  if (existing) {
    res.status(400).json({ error: "Already a member of this chama" });
    return;
  }

  const [member] = await db
    .insert(chamaMembers)
    .values({
      id: newId(),
      chamaId: chama.id,
      userId: user.id,
      role: "member",
    })
    .returning();

  res.status(201).json({ data: member });
});

// POST /:id/contribute — resident contributes to a chama (M-PESA stub in dev)
chamaRouter.post("/:id/contribute", async (req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) {
    res.status(400).json({ error: "No estate assigned" });
    return;
  }

  const parsed = chamaContributeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { amount, periodLabel } = parsed.data;

  const [chama] = await db
    .select()
    .from(chamas)
    .where(
      and(
        eq(chamas.id, req.params.id!),
        eq(chamas.estateId, user.estateId),
      ),
    )
    .limit(1);

  if (!chama) {
    res.status(404).json({ error: "Chama not found" });
    return;
  }

  // Verify caller is a member
  const [membership] = await db
    .select()
    .from(chamaMembers)
    .where(
      and(
        eq(chamaMembers.chamaId, chama.id),
        eq(chamaMembers.userId, user.id),
      ),
    )
    .limit(1);

  if (!membership) {
    res.status(403).json({ error: "You are not a member of this chama" });
    return;
  }

  const [contribution] = await db
    .insert(chamaContributions)
    .values({
      id: newId(),
      chamaId: chama.id,
      userId: user.id,
      amount: String(amount),
      periodLabel: periodLabel.trim(),
      mpesaRef: "STUB", // dev stub — replace with real M-PESA flow in production
      paidAt: new Date(),
    })
    .returning();

  res.status(201).json({ data: contribution });
});

// GET /:id/contributions — list contributions for a chama (admin or member only)
chamaRouter.get("/:id/contributions", async (req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) { res.json({ data: [] }); return; }

  const [chama] = await db
    .select()
    .from(chamas)
    .where(
      and(
        eq(chamas.id, req.params.id!),
        eq(chamas.estateId, user.estateId),
      ),
    )
    .limit(1);

  if (!chama) {
    res.status(404).json({ error: "Chama not found" });
    return;
  }

  // Must be a member or estate admin
  const isEstateAdmin = user.role === "admin";
  if (!isEstateAdmin) {
    const [membership] = await db
      .select()
      .from(chamaMembers)
      .where(
        and(
          eq(chamaMembers.chamaId, chama.id),
          eq(chamaMembers.userId, user.id),
        ),
      )
      .limit(1);

    if (!membership) {
      res.status(403).json({ error: "Access denied — members only" });
      return;
    }
  }

  const rows = await db
    .select({
      id: chamaContributions.id,
      chamaId: chamaContributions.chamaId,
      userId: chamaContributions.userId,
      amount: chamaContributions.amount,
      periodLabel: chamaContributions.periodLabel,
      mpesaRef: chamaContributions.mpesaRef,
      paidAt: chamaContributions.paidAt,
      createdAt: chamaContributions.createdAt,
      contributorName: users.name,
      contributorUnit: users.unitNumber,
    })
    .from(chamaContributions)
    .leftJoin(users, eq(chamaContributions.userId, users.id))
    .where(eq(chamaContributions.chamaId, chama.id))
    .orderBy(desc(chamaContributions.createdAt));

  res.json({ data: rows });
});

// GET /:id/members — list members of a chama
chamaRouter.get("/:id/members", async (req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) { res.json({ data: [] }); return; }

  const [chama] = await db
    .select()
    .from(chamas)
    .where(
      and(
        eq(chamas.id, req.params.id!),
        eq(chamas.estateId, user.estateId),
      ),
    )
    .limit(1);

  if (!chama) {
    res.status(404).json({ error: "Chama not found" });
    return;
  }

  const rows = await db
    .select({
      id: chamaMembers.id,
      chamaId: chamaMembers.chamaId,
      userId: chamaMembers.userId,
      role: chamaMembers.role,
      joinedAt: chamaMembers.joinedAt,
      memberName: users.name,
      memberUnit: users.unitNumber,
    })
    .from(chamaMembers)
    .leftJoin(users, eq(chamaMembers.userId, users.id))
    .where(eq(chamaMembers.chamaId, chama.id))
    .orderBy(chamaMembers.joinedAt);

  res.json({ data: rows });
});
