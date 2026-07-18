import { Router } from "express";
import { db } from "../db.js";
import { leads } from "@shared/schema.js";
import { createLeadSchema } from "@shared/validators.js";
import { newId } from "../lib/ids.js";
import { logger } from "../lib/logger.js";

export const leadsRouter = Router();

// Public — "bring JiraniHub to your estate" landing-page inquiries. No auth:
// the whole point is capturing prospects who aren't customers yet.
leadsRouter.post("/", async (req, res) => {
  const parsed = createLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }

  const { email, ...rest } = parsed.data;
  const [row] = await db
    .insert(leads)
    .values({ id: newId(), email: email || undefined, ...rest })
    .returning();

  logger.info({ leadId: row!.id, estateName: row!.estateName }, "New estate lead captured");
  res.status(201).json({ data: { id: row!.id } });
});
