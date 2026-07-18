import { Router } from "express";
import { desc } from "drizzle-orm";
import { db } from "../db.js";
import { leads } from "@shared/schema.js";
import { createLeadSchema } from "@shared/validators.js";
import { newId } from "../lib/ids.js";
import { logger } from "../lib/logger.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";

export const leadsRouter = Router();

// Public — "bring JiraniHub to your estate" landing-page inquiries. No auth:
// the whole point is capturing prospects who aren't customers yet.
leadsRouter.post("/", async (req, res) => {
  const parsed = createLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const [row] = await db
    .insert(leads)
    .values({ id: newId(), ...parsed.data })
    .returning();

  logger.info({ leadId: row!.id, estateName: row!.estateName }, "New estate lead captured");
  res.status(201).json({ data: { id: row!.id } });
});

// Admin-only — otherwise a captured lead is invisible until someone thinks
// to query the DB directly.
leadsRouter.get("/", requireAuth, requireRole("admin"), async (_req, res) => {
  const rows = await db.select().from(leads).orderBy(desc(leads.createdAt)).limit(200);
  res.json({ data: rows });
});
