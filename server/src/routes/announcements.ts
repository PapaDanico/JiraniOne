import { Router } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db } from "../db.js";
import { announcements } from "@shared/schema.js";
import { createAnnouncementSchema } from "@shared/validators.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { newId } from "../lib/ids.js";

export const announcementsRouter = Router();
announcementsRouter.use(requireAuth);

announcementsRouter.get("/", async (_req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) { res.json({ data: [] }); return; }
  const rows = await db
    .select()
    .from(announcements)
    .where(eq(announcements.estateId, user.estateId))
    .orderBy(desc(announcements.createdAt))
    .limit(50);
  res.json({ data: rows });
});

announcementsRouter.post("/", requireRole("admin"), async (req, res) => {
  const user = res.locals.user!;
  const parsed = createAnnouncementSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const [row] = await db
    .insert(announcements)
    .values({
      id: newId(),
      estateId: user.estateId!,
      authorId: user.id,
      title: parsed.data.title,
      body: parsed.data.body,
      priority: parsed.data.priority,
    })
    .returning();

  res.status(201).json({ data: row });
});
