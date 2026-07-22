import { Router } from "express";
import { eq, desc, ne, and, inArray, count } from "drizzle-orm";
import { db } from "../db.js";
import { announcements, announcementReads, users } from "@shared/schema.js";
import { createAnnouncementSchema } from "@shared/validators.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { newId } from "../lib/ids.js";
import { createNotifications } from "../lib/notify.js";
import { sendThrottledSms } from "../lib/sms.js";
import { logger } from "../lib/logger.js";
import { SMS_SENDER_ID } from "@shared/brand.js";

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

  if (rows.length === 0) { res.json({ data: [] }); return; }

  const myReads = await db
    .select({ announcementId: announcementReads.announcementId })
    .from(announcementReads)
    .where(and(
      inArray(announcementReads.announcementId, rows.map((r) => r.id)),
      eq(announcementReads.userId, user.id),
    ));
  const readSet = new Set(myReads.map((r) => r.announcementId));

  res.json({ data: rows.map((r) => ({ ...r, myAcknowledged: readSet.has(r.id) })) });
});

// Mark "I've seen this" — idempotent, so a double-tap or retry doesn't error.
announcementsRouter.post("/:id/acknowledge", async (req, res) => {
  const user = res.locals.user!;
  const [ann] = await db.select({ id: announcements.id }).from(announcements)
    .where(and(eq(announcements.id, req.params['id']!), eq(announcements.estateId, user.estateId!))).limit(1);
  if (!ann) { res.status(404).json({ error: "Announcement not found" }); return; }

  await db.insert(announcementReads)
    .values({ id: newId(), announcementId: ann.id, userId: user.id })
    .onConflictDoNothing();

  res.json({ data: { success: true } });
});

// Admin: who has actually seen this one — lazy-loaded on demand rather
// than joined into every list fetch, since only admins reviewing an
// announcement's reach need it.
announcementsRouter.get("/:id/reads", requireRole("admin"), async (req, res) => {
  const user = res.locals.user!;
  const [ann] = await db.select({ id: announcements.id, authorId: announcements.authorId }).from(announcements)
    .where(and(eq(announcements.id, req.params['id']!), eq(announcements.estateId, user.estateId!))).limit(1);
  if (!ann) { res.status(404).json({ error: "Announcement not found" }); return; }

  const [totalRecipients, acknowledgedCount, readers] = await Promise.all([
    db.select({ value: count() }).from(users)
      .where(and(eq(users.estateId, user.estateId!), ne(users.id, ann.authorId)))
      .then((r) => r[0]?.value ?? 0),
    db.select({ value: count() }).from(announcementReads)
      .where(eq(announcementReads.announcementId, ann.id))
      .then((r) => r[0]?.value ?? 0),
    db.select({ name: users.name, unitNumber: users.unitNumber, readAt: announcementReads.createdAt })
      .from(announcementReads)
      .innerJoin(users, eq(users.id, announcementReads.userId))
      .where(eq(announcementReads.announcementId, ann.id))
      .orderBy(desc(announcementReads.createdAt)),
  ]);

  res.json({ data: { totalRecipients, acknowledgedCount, readers } });
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
        const message = `${SMS_SENDER_ID} URGENT: ${parsed.data.title} — ${parsed.data.body}`.slice(0, 300);
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
        } else {
          // Every send resolved { ok: false } (not thrown) — the per-item
          // .catch() above only logs thrown errors, so a systemic issue
          // (unconfigured provider, exhausted global cap) would otherwise
          // leave an "urgent" broadcast silently undelivered with no signal.
          logger.error({ announcementId: row!.id, recipientCount: estateUsers.length }, "urgent announcement SMS fan-out: all sends failed");
        }
      }
    }
  } catch (err) {
    logger.error({ err, announcementId: row!.id }, "announcement broadcast fan-out failed");
  }
});
