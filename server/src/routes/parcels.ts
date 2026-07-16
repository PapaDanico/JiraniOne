import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db.js";
import { parcels, users } from "@shared/schema.js";
import {
  createParcelSchema,
  updateParcelSchema,
} from "@shared/validators.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { newId } from "../lib/ids.js";
import { createNotification } from "../lib/notify.js";

export const parcelsRouter = Router();
parcelsRouter.use(requireAuth);

// Resident: list my expected/received parcels
parcelsRouter.get("/my", async (_req, res) => {
  const user = res.locals.user!;
  const rows = await db
    .select()
    .from(parcels)
    .where(eq(parcels.residentId, user.id))
    .orderBy(desc(parcels.createdAt))
    .limit(50);
  res.json({ data: rows });
});

// Security / Admin: list all parcels at gate or estate
parcelsRouter.get("/estate", requireRole("admin", "security"), async (_req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) { res.json({ data: [] }); return; }

  const rows = await db.query.parcels.findMany({
    where: eq(parcels.estateId, user.estateId),
    with: {
      resident: { columns: { name: true, unitNumber: true } },
      receivedBy: { columns: { name: true } },
    },
    orderBy: desc(parcels.createdAt),
    limit: 100,
  });
  res.json({ data: rows });
});

// Resident: register an expected parcel
parcelsRouter.post("/", async (req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) { res.status(400).json({ error: "No estate assigned" }); return; }

  const parsed = createParcelSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { description, trackingRef, sender } = parsed.data;

  const [parcel] = await db
    .insert(parcels)
    .values({
      id: newId(),
      estateId: user.estateId,
      residentId: user.id,
      description: description.trim(),
      trackingRef: trackingRef?.trim() || null,
      sender: sender?.trim() || null,
      status: "expected",
    })
    .returning();

  res.status(201).json({ data: parcel });
});

// Security: mark parcel received at gate
parcelsRouter.patch("/:id/received", requireRole("admin", "security"), async (req, res) => {
  const user = res.locals.user!;
  const parsed = updateParcelSchema.pick({ notes: true }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { notes } = parsed.data;

  const [parcel] = await db
    .select()
    .from(parcels)
    .where(and(eq(parcels.id, req.params.id!), eq(parcels.estateId, user.estateId!)))
    .limit(1);

  if (!parcel) { res.status(404).json({ error: "Parcel not found" }); return; }

  const [updated] = await db
    .update(parcels)
    .set({
      status: "at_gate",
      receivedAt: new Date(),
      receivedById: user.id,
      notes: notes?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(parcels.id, parcel.id))
    .returning();

  // Notify the resident
  const [resident] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, parcel.residentId))
    .limit(1);

  await createNotification({
    userId: parcel.residentId,
    title: "📦 Parcel at Gate",
    body: `Your parcel (${parcel.description}) has arrived at the gate. Please collect it.`,
    type: "parcel",
    linkTo: "/parcels",
  });

  res.json({ data: updated });
});

// Resident / Security: mark parcel collected
parcelsRouter.patch("/:id/collected", async (req, res) => {
  const user = res.locals.user!;

  const [parcel] = await db
    .select()
    .from(parcels)
    .where(eq(parcels.id, req.params.id!))
    .limit(1);

  if (!parcel || parcel.estateId !== user.estateId) {
    res.status(404).json({ error: "Parcel not found" });
    return;
  }

  // Only resident owner, security, or admin can mark collected
  const isOwner = parcel.residentId === user.id;
  const isStaff = user.role === "admin" || user.role === "security";
  if (!isOwner && !isStaff) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (parcel.status !== "at_gate") {
    res.status(400).json({
      error: "Parcel must be received at the gate before it can be marked collected",
    });
    return;
  }

  const [updated] = await db
    .update(parcels)
    .set({ status: "collected", collectedAt: new Date(), updatedAt: new Date() })
    .where(eq(parcels.id, parcel.id))
    .returning();

  res.json({ data: updated });
});

// Resident: delete expected parcel
parcelsRouter.delete("/:id", async (req, res) => {
  const user = res.locals.user!;
  await db
    .delete(parcels)
    .where(and(eq(parcels.id, req.params.id!), eq(parcels.residentId, user.id)));
  res.json({ data: { success: true } });
});
