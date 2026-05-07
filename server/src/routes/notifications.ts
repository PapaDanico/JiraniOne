import { Router } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db } from "../db.js";
import { notifications } from "@shared/schema.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get("/", async (_req, res) => {
  const user = res.locals.user!;
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
  res.json({ data: rows });
});

notificationsRouter.patch("/:id/read", async (req, res) => {
  const user = res.locals.user!;
  await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.id, req.params['id']!),
        eq(notifications.userId, user.id),
      ),
    );
  res.json({ data: { success: true } });
});

notificationsRouter.patch("/read-all", async (_req, res) => {
  const user = res.locals.user!;
  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.userId, user.id));
  res.json({ data: { success: true } });
});
