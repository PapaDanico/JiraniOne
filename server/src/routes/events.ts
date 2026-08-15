import { Router } from "express";
import { eq, desc, and, gte, count, inArray } from "drizzle-orm";
import { db } from "../db.js";
import { events, eventRsvps } from "@shared/schema.js";
import { createEventSchema, eventRsvpSchema } from "@shared/validators.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { newId } from "../lib/ids.js";

export const eventsRouter = Router();
eventsRouter.use(requireAuth);

// List upcoming estate events (+ my RSVP status + counts)
eventsRouter.get("/", async (_req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) { res.json({ data: [] }); return; }

  const now = new Date();
  const rows = await db.select().from(events)
    .where(and(eq(events.estateId, user.estateId), gte(events.endTime, now)))
    .orderBy(events.startTime)
    .limit(50);

  // Attach RSVP count + my status per event.
  //
  // Two grouped queries rather than two per event. This previously ran a
  // count and a lookup inside a .map() over a 50-row limit — up to 101 round
  // trips for one request, on an endpoint usePolling refetches every 15s.
  // Same batching shape chama.ts already uses.
  const eventIds = rows.map((e) => e.id);
  const [rsvpCounts, myRsvps] = eventIds.length
    ? await Promise.all([
        db
          .select({ eventId: eventRsvps.eventId, cnt: count() })
          .from(eventRsvps)
          .where(and(inArray(eventRsvps.eventId, eventIds), eq(eventRsvps.attending, true)))
          .groupBy(eventRsvps.eventId),
        db
          .select({ eventId: eventRsvps.eventId, attending: eventRsvps.attending })
          .from(eventRsvps)
          .where(and(inArray(eventRsvps.eventId, eventIds), eq(eventRsvps.userId, user.id))),
      ])
    : [[], []];

  const countByEventId = new Map(rsvpCounts.map((r) => [r.eventId, Number(r.cnt)]));
  const myRsvpByEventId = new Map(myRsvps.map((r) => [r.eventId, r.attending]));

  const enriched = rows.map((e) => ({
    ...e,
    rsvpCount: countByEventId.get(e.id) ?? 0,
    myRsvp: myRsvpByEventId.get(e.id) ?? null,
  }));

  res.json({ data: enriched });
});

// Admin: create event
eventsRouter.post("/", requireRole("admin"), async (req, res) => {
  const user = res.locals.user!;
  const parsed = createEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const [row] = await db.insert(events).values({
    id: newId(),
    estateId: user.estateId!,
    createdById: user.id,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    location: parsed.data.location ?? null,
    eventType: parsed.data.eventType ?? null,
    startTime: new Date(parsed.data.startTime),
    endTime: new Date(parsed.data.endTime),
    recurring: parsed.data.recurring,
  }).returning();

  res.status(201).json({ data: row });
});

// Admin: delete event
eventsRouter.delete("/:id", requireRole("admin"), async (req, res) => {
  const user = res.locals.user!;
  const [existing] = await db.select().from(events)
    .where(and(eq(events.id, req.params['id']!), eq(events.estateId, user.estateId!))).limit(1);
  if (!existing) { res.status(404).json({ error: "Event not found" }); return; }
  await db.delete(events).where(eq(events.id, req.params['id']!));
  res.json({ data: { success: true } });
});

// Resident: RSVP
eventsRouter.post("/:id/rsvp", async (req, res) => {
  const user = res.locals.user!;
  const parsed = eventRsvpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { attending } = parsed.data;

  const [event] = await db.select().from(events)
    .where(and(eq(events.id, req.params['id']!), eq(events.estateId, user.estateId!))).limit(1);
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }

  // Atomic upsert on the (eventId, userId) unique index — a plain
  // check-then-insert here let a double-tap on a slow connection (the exact
  // 3G scenario CLAUDE.md calls out) create two RSVP rows for one user,
  // permanently over-counting rsvpCount.
  const [row] = await db.insert(eventRsvps).values({
    id: newId(),
    eventId: req.params['id']!,
    userId: user.id,
    attending,
  }).onConflictDoUpdate({
    target: [eventRsvps.eventId, eventRsvps.userId],
    set: { attending },
  }).returning();
  res.json({ data: row });
});
