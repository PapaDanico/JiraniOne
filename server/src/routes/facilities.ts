import { Router } from "express";
import { eq, desc, and, lte, gte, or, ne } from "drizzle-orm";
import { db, dbTx } from "../db.js";
import { facilities, bookings, users } from "@shared/schema.js";
import { createFacilitySchema, createBookingSchema } from "@shared/validators.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { newId } from "../lib/ids.js";

export const facilitiesRouter = Router();
facilitiesRouter.use(requireAuth);

// List estate facilities
facilitiesRouter.get("/", async (_req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) { res.json({ data: [] }); return; }
  const rows = await db.select().from(facilities)
    .where(eq(facilities.estateId, user.estateId))
    .orderBy(facilities.name);
  res.json({ data: rows });
});

// Admin: create facility
facilitiesRouter.post("/", requireRole("admin"), async (req, res) => {
  const user = res.locals.user!;
  const parsed = createFacilitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { name, description, requiresApproval, maxBookingHours } = parsed.data;

  const [row] = await db.insert(facilities).values({
    id: newId(),
    estateId: user.estateId!,
    name,
    description: description ?? null,
    requiresApproval,
    maxBookingHours,
  }).returning();
  res.status(201).json({ data: row });
});

// Admin: update facility
facilitiesRouter.patch("/:id", requireRole("admin"), async (req, res) => {
  const user = res.locals.user!;
  const [existing] = await db.select().from(facilities)
    .where(and(eq(facilities.id, req.params['id']!), eq(facilities.estateId, user.estateId!))).limit(1);
  if (!existing) { res.status(404).json({ error: "Facility not found" }); return; }

  const { name, description, requiresApproval, maxBookingHours } = req.body as {
    name?: string; description?: string; requiresApproval?: boolean; maxBookingHours?: number;
  };
  const [updated] = await db.update(facilities)
    .set({ name: name ?? existing.name, description: description ?? existing.description,
           requiresApproval: requiresApproval ?? existing.requiresApproval,
           maxBookingHours: maxBookingHours ?? existing.maxBookingHours })
    .where(eq(facilities.id, req.params['id']!))
    .returning();
  res.json({ data: updated });
});

// ─── Bookings ─────────────────────────────────────────────────────────────────

// Resident: my bookings | Admin: all estate bookings
facilitiesRouter.get("/bookings", async (_req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) { res.json({ data: [] }); return; }

  if (user.role === "admin") {
    const rows = await db
      .select({
        id: bookings.id,
        facilityId: bookings.facilityId,
        userId: bookings.userId,
        estateId: bookings.estateId,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        status: bookings.status,
        notes: bookings.notes,
        createdAt: bookings.createdAt,
        facilityName: facilities.name,
        userName: users.name,
        unitNumber: users.unitNumber,
      })
      .from(bookings)
      .innerJoin(facilities, eq(bookings.facilityId, facilities.id))
      .innerJoin(users, eq(bookings.userId, users.id))
      .where(eq(bookings.estateId, user.estateId))
      .orderBy(desc(bookings.startTime))
      .limit(100);
    res.json({ data: rows });
    return;
  }

  const rows = await db
    .select({
      id: bookings.id,
      facilityId: bookings.facilityId,
      userId: bookings.userId,
      estateId: bookings.estateId,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      status: bookings.status,
      notes: bookings.notes,
      createdAt: bookings.createdAt,
      facilityName: facilities.name,
    })
    .from(bookings)
    .innerJoin(facilities, eq(bookings.facilityId, facilities.id))
    .where(and(eq(bookings.userId, user.id), eq(bookings.estateId, user.estateId)))
    .orderBy(desc(bookings.startTime))
    .limit(50);
  res.json({ data: rows });
});

// Resident: create booking
facilitiesRouter.post("/bookings", async (req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) { res.status(400).json({ error: "No estate assigned" }); return; }

  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { facilityId, startTime, endTime, notes } = parsed.data;

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (end <= start) { res.status(400).json({ error: "endTime must be after startTime" }); return; }
  if (start < new Date()) { res.status(400).json({ error: "Cannot book in the past" }); return; }

  const estateId = user.estateId;

  try {
    const row = await dbTx.transaction(async (tx) => {
      // Lock the facility row so two concurrent bookings for it serialize —
      // without this, both requests can pass the conflict check before
      // either INSERT commits, double-booking the same slot.
      const [facility] = await tx.select().from(facilities)
        .where(and(eq(facilities.id, facilityId), eq(facilities.estateId, estateId)))
        .for("update")
        .limit(1);
      if (!facility) {
        throw Object.assign(new Error("Facility not found"), { httpStatus: 404 });
      }

      const hours = (end.getTime() - start.getTime()) / 3_600_000;
      if (hours > facility.maxBookingHours) {
        throw Object.assign(
          new Error(`Maximum ${facility.maxBookingHours} hours per booking`),
          { httpStatus: 400 },
        );
      }

      const conflicts = await tx.select().from(bookings)
        .where(and(
          eq(bookings.facilityId, facilityId),
          or(eq(bookings.status, "pending"), eq(bookings.status, "approved")),
          lte(bookings.startTime, end),
          gte(bookings.endTime, start),
        )).limit(1);

      if (conflicts.length > 0) {
        throw Object.assign(new Error("Time slot is already booked"), { httpStatus: 409 });
      }

      const [inserted] = await tx.insert(bookings).values({
        id: newId(),
        facilityId,
        userId: user.id,
        estateId,
        startTime: start,
        endTime: end,
        status: facility.requiresApproval ? "pending" : "approved",
        notes: notes ?? null,
      }).returning();

      return inserted;
    });

    res.status(201).json({ data: row });
  } catch (err) {
    const httpStatus = (err as { httpStatus?: number }).httpStatus;
    if (httpStatus) {
      res.status(httpStatus).json({ error: (err as Error).message });
      return;
    }
    throw err;
  }
});

// Admin: approve/reject | Resident: cancel
facilitiesRouter.patch("/bookings/:id", async (req, res) => {
  const user = res.locals.user!;
  const status = (req.body as { status?: string })?.status;
  const allowedStatuses = ["approved", "rejected", "cancelled", "completed"] as const;
  if (!status || !allowedStatuses.includes(status as typeof allowedStatuses[number])) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const [booking] = await db.select().from(bookings)
    .where(eq(bookings.id, req.params['id']!)).limit(1);
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
  if (booking.estateId !== user.estateId) { res.status(403).json({ error: "Access denied" }); return; }

  if (user.role !== "admin" && booking.userId !== user.id) {
    res.status(403).json({ error: "Access denied" }); return;
  }
  if (user.role !== "admin" && status !== "cancelled") {
    res.status(403).json({ error: "Only admin can change status" }); return;
  }

  if (status === "approved") {
    // Re-run the overlap check: the create-time check only ran once, and a
    // booking that was rejected/cancelled since then may have let a
    // conflicting slot get approved in the meantime.
    const conflicts = await db.select().from(bookings)
      .where(and(
        eq(bookings.facilityId, booking.facilityId),
        eq(bookings.status, "approved"),
        ne(bookings.id, booking.id),
        lte(bookings.startTime, booking.endTime),
        gte(bookings.endTime, booking.startTime),
      )).limit(1);
    if (conflicts.length > 0) {
      res.status(409).json({ error: "Time slot conflicts with another approved booking" });
      return;
    }
  }

  const [updated] = await db.update(bookings)
    .set({ status: status as never, updatedAt: new Date() })
    .where(eq(bookings.id, req.params['id']!))
    .returning();
  res.json({ data: updated });
});
