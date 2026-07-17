import { Router } from "express";
import { eq, desc, and, inArray } from "drizzle-orm";
import { db, dbTx } from "../db.js";
import { chamas, chamaMembers, chamaContributions, payments, users } from "@shared/schema.js";
import {
  createChamaSchema,
  chamaContributeSchema,
} from "@shared/validators.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { newId } from "../lib/ids.js";
import { stkPush, isMpesaConfigured } from "../lib/mpesa.js";
import { logger } from "../lib/logger.js";

const log = logger.child({ component: "chama" });

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

  // Fetch all memberships for these chamas. `inArray` (not a raw
  // `sql\`ANY(${chamaIds})\`` interpolation) — postgres.js doesn't
  // auto-serialize a plain JS array into a Postgres array literal, and the
  // raw form throws "malformed array literal" at runtime despite
  // typechecking fine.
  const [allMembers, allContributions] = await Promise.all([
    db.select().from(chamaMembers).where(inArray(chamaMembers.chamaId, chamaIds)),
    db
      .select({ chamaId: chamaContributions.chamaId, amount: chamaContributions.amount })
      .from(chamaContributions)
      .where(inArray(chamaContributions.chamaId, chamaIds)),
  ]);

  const countByChamaId = new Map<string, number>();
  const myMembershipByChamaId = new Map<string, typeof allMembers[number]>();

  for (const m of allMembers) {
    countByChamaId.set(m.chamaId, (countByChamaId.get(m.chamaId) ?? 0) + 1);
    if (m.userId === user.id) {
      myMembershipByChamaId.set(m.chamaId, m);
    }
  }

  // The point of a chama is the pot — showing member count without the
  // total saved was the actual gap, not a missing endpoint (the detail
  // /:id/contributions and /:id/members routes already existed but the
  // client never surfaced them). Summing here keeps the list endpoint a
  // single round trip instead of N+1 requests per chama.
  const totalByChamaId = new Map<string, number>();
  for (const c of allContributions) {
    totalByChamaId.set(c.chamaId, (totalByChamaId.get(c.chamaId) ?? 0) + Number(c.amount));
  }

  const data = rows.map((chama) => ({
    ...chama,
    memberCount: countByChamaId.get(chama.id) ?? 0,
    totalContributed: totalByChamaId.get(chama.id) ?? 0,
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

  try {
    const member = await dbTx.transaction(async (tx) => {
      // Lock the chama row so two concurrent joins by the same user
      // serialize — without this, both requests can pass the membership
      // check before either INSERT commits, creating duplicate rows.
      const [chama] = await tx
        .select()
        .from(chamas)
        .where(
          and(
            eq(chamas.id, req.params.id!),
            eq(chamas.estateId, user.estateId!),
          ),
        )
        .for("update")
        .limit(1);

      if (!chama) {
        throw Object.assign(new Error("Chama not found"), { httpStatus: 404 });
      }
      if (chama.status !== "active") {
        throw Object.assign(
          new Error("Chama is not accepting new members"),
          { httpStatus: 400 },
        );
      }

      const [existing] = await tx
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
        throw Object.assign(
          new Error("Already a member of this chama"),
          { httpStatus: 400 },
        );
      }

      const [inserted] = await tx
        .insert(chamaMembers)
        .values({
          id: newId(),
          chamaId: chama.id,
          userId: user.id,
          role: "member",
        })
        .returning();

      return inserted;
    });

    res.status(201).json({ data: member });
  } catch (err) {
    const httpStatus = (err as { httpStatus?: number }).httpStatus;
    if (httpStatus) {
      res.status(httpStatus).json({ error: (err as Error).message });
      return;
    }
    throw err;
  }
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

  const paymentId = newId();
  const [payment] = await db
    .insert(payments)
    .values({
      id: paymentId,
      userId: user.id,
      estateId: user.estateId!,
      amount: String(amount),
      phoneUsed: user.phone,
      type: "chama_contribution",
      status: "pending",
      description: `Chama: ${chama.name}`,
      metadata: { chamaId: chama.id, periodLabel: periodLabel.trim() },
    })
    .returning();

  if (!isMpesaConfigured()) {
    // Dev stub only — never in production (see payments.ts /stk-push for
    // why: a missing Daraja env var must fail loudly, not silently
    // auto-complete a real contribution for free).
    if (process.env.NODE_ENV === "production") {
      await db
        .update(payments)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(payments.id, paymentId));
      res.status(503).json({ error: "Payments are temporarily unavailable. Please try again shortly." });
      return;
    }

    await db
      .update(payments)
      .set({ status: "completed", mpesaRef: "DEV_STUB", updatedAt: new Date() })
      .where(eq(payments.id, paymentId));

    const [contribution] = await db
      .insert(chamaContributions)
      .values({
        id: newId(),
        chamaId: chama.id,
        userId: user.id,
        amount: String(amount),
        periodLabel: periodLabel.trim(),
        mpesaRef: "DEV_STUB",
        paidAt: new Date(),
      })
      .returning();

    res.status(201).json({ data: { payment: payment!, contribution, stub: true } });
    return;
  }

  try {
    const result = await stkPush({
      phone: user.phone,
      amount,
      accountRef: chama.id.slice(0, 12),
      description: `Chama contribution`,
    });
    await db
      .update(payments)
      .set({ checkoutRequestId: result.CheckoutRequestID, updatedAt: new Date() })
      .where(eq(payments.id, paymentId));

    res.json({ data: { payment: payment!, message: result.CustomerMessage } });
  } catch (err) {
    log.error(
      { event: "chama_stk_push_failed", paymentId, chamaId: chama.id, err },
      "STK push failed for chama contribution",
    );
    await db
      .update(payments)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(payments.id, paymentId));
    res.status(502).json({ error: "STK Push failed — please try again" });
  }
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

  // Nested `user` object, not flat contributorName/contributorUnit — matches
  // the ChamaContribution type and the pattern every other joined-user list
  // in this app uses (carpool's flat/nested mismatch caused a real
  // "Driver: Unknown" display bug earlier; fixing the shape here before any
  // client code consumes this endpoint rather than after).
  const data = rows.map(({ contributorName, contributorUnit, ...r }) => ({
    ...r,
    user: { name: contributorName, unitNumber: contributorUnit },
  }));

  res.json({ data });
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
