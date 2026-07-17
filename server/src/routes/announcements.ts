import { Router } from "express";
import { eq, desc, ne, and } from "drizzle-orm";
import { db } from "../db.js";
import { announcements, users } from "@shared/schema.js";
import { createAnnouncementSchema } from "@shared/validators.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { newId } from "../lib/ids.js";
import { createNotifications } from "../lib/notify.js";
import { sendThrottledSms } from "../lib/sms.js";
import { logger } from "../lib/logger.js";

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

  // Broadcast fallback — CLAUDE.md specs announcements as "push + SMS +
  // in-app", but this previously only ever wrote the row: residents found
  // out solely by happening to open the Announcements tab. In-app
  // notification goes to everyone in the estate for any priority; SMS is
  // reserved for "urgent" only, so routine notices don't burn through the
  // per-user/global daily SMS caps for something residents will see next
  // time they open the app anyway. Fired after responding so the admin's
  // confirmation isn't held up by the fan-out, but still awaited since a
  // serverless function can be frozen right after the response is sent.
  try {
    const estateUsers = await db
      .select({ id: users.id, phone: users.phone })
      .from(users)
      .where(and(eq(users.estateId, user.estateId!), ne(users.id, user.id)));

    if (estateUsers.length > 0) {
      await createNotifications({
        userIds: estateUsers.map((u) => u.id),
        title: parsed.data.title,
        body: parsed.data.body,
        type: "announcement",
        linkTo: "/announcements",
      });

      if (parsed.data.priority === "urgent") {
        const message = `JiraniHub URGENT: ${parsed.data.title} — ${parsed.data.body}`.slice(0, 300);
        const results = await Promise.all(
          estateUsers.map((u) =>
            sendThrottledSms({ userId: u.id, to: u.phone, message, systemMessage: true })
              .catch((err) => {
                logger.error({ err, userId: u.id }, "announcement sms failed");
                return { ok: false } as const;
              }),
          ),
        );
        if (results.some((r) => r.ok)) {
          await db.update(announcements).set({ smsSent: true }).where(eq(announcements.id, row!.id));
        }
      }
    }
  } catch (err) {
    logger.error({ err, announcementId: row!.id }, "announcement broadcast fan-out failed");
  }
});
