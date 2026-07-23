import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, dbTx } from "../db.js";
import { estates, users } from "@shared/schema.js";
import { createEstateSchema, updateEstateSchema } from "@shared/validators.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { newId } from "../lib/ids.js";
import { writeAudit } from "../lib/audit.js";
import { TRIAL_DAYS } from "@shared/billing.js";

export const estatesRouter = Router();
estatesRouter.use(requireAuth);

// Self-serve estate creation — the "inquiry → trial estate" path. Any
// authenticated account that doesn't yet belong to an estate can create
// one and becomes its admin. Deliberately NOT open to accounts already in
// an estate (a resident can't quietly spin up a second estate and make
// themselves an admin), and the whole thing is transactional so a crash
// can't leave an estate with no admin or an admin with no estate.
estatesRouter.post("/", async (req, res) => {
  const user = res.locals.user!;

  if (user.estateId) {
    res.status(409).json({ error: "You already belong to an estate. Ask your admin, or contact support to start a new one." });
    return;
  }
  if (user.role !== "resident") {
    res.status(403).json({ error: "Only personal accounts can create an estate." });
    return;
  }

  const parsed = createEstateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { name, location, totalUnits } = parsed.data;

  const estate = await dbTx.transaction(async (tx) => {
    const [row] = await tx.insert(estates).values({
      id: newId(),
      name,
      location,
      totalUnits: totalUnits ?? null,
      adminId: user.id,
      // 30-day full-featured trial starts now (shared/billing.ts) — the
      // billing cron only ever invoices estates whose trial has lapsed.
      trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
    }).returning();

    await tx.update(users)
      .set({ estateId: row!.id, role: "admin", updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return row!;
  });

  void writeAudit(req, {
    action: "estate.self_serve_created",
    targetType: "estate",
    targetId: estate.id,
    metadata: { name, location },
  });

  res.status(201).json({ data: estate });
});

// Admin: update own estate's settings (name, location, security desk
// phone, unit count, coordinates for the weather/traffic widgets).
estatesRouter.patch("/me", requireRole("admin"), async (req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) {
    res.status(400).json({ error: "No estate on this account" });
    return;
  }

  const parsed = updateEstateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const p = parsed.data;

  const [updated] = await db.update(estates)
    .set({
      ...(p.name !== undefined ? { name: p.name } : {}),
      ...(p.location !== undefined ? { location: p.location } : {}),
      ...(p.totalUnits !== undefined ? { totalUnits: p.totalUnits } : {}),
      ...(p.securityPhone !== undefined ? { securityPhone: p.securityPhone } : {}),
      ...(p.lat !== undefined ? { lat: p.lat == null ? null : String(p.lat) } : {}),
      ...(p.lng !== undefined ? { lng: p.lng == null ? null : String(p.lng) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(estates.id, user.estateId))
    .returning();

  void writeAudit(req, {
    action: "estate.settings_updated",
    targetType: "estate",
    targetId: user.estateId,
    metadata: p as Record<string, unknown>,
  });

  res.json({ data: updated });
});
