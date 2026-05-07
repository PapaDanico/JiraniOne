import { Router } from "express";
import { eq, desc, and, gte } from "drizzle-orm";
import { db } from "../db.js";
import { carpoolOffers, carpoolBookings, users } from "@shared/schema.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { newId } from "../lib/ids.js";

export const carpoolRouter = Router();
carpoolRouter.use(requireAuth);

// GET / — list active carpool offers for the estate (future departures only)
//   Includes driver name/unit; includes myBooking if the current user has booked it
carpoolRouter.get("/", async (_req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) { res.json({ data: [] }); return; }

  const now = new Date();

  // Fetch active offers with driver info
  const offers = await db
    .select({
      id: carpoolOffers.id,
      estateId: carpoolOffers.estateId,
      driverId: carpoolOffers.driverId,
      origin: carpoolOffers.origin,
      destination: carpoolOffers.destination,
      departureTime: carpoolOffers.departureTime,
      seatsTotal: carpoolOffers.seatsTotal,
      seatsAvailable: carpoolOffers.seatsAvailable,
      fare: carpoolOffers.fare,
      notes: carpoolOffers.notes,
      status: carpoolOffers.status,
      createdAt: carpoolOffers.createdAt,
      updatedAt: carpoolOffers.updatedAt,
      driverName: users.name,
      driverUnit: users.unitNumber,
    })
    .from(carpoolOffers)
    .leftJoin(users, eq(carpoolOffers.driverId, users.id))
    .where(
      and(
        eq(carpoolOffers.estateId, user.estateId),
        eq(carpoolOffers.status, "active"),
        gte(carpoolOffers.departureTime, now),
      ),
    )
    .orderBy(carpoolOffers.departureTime);

  if (offers.length === 0) {
    res.json({ data: [] });
    return;
  }

  // Fetch all bookings for the current user across these offers
  const offerIds = offers.map((o) => o.id);

  const myBookings = await db
    .select()
    .from(carpoolBookings)
    .where(eq(carpoolBookings.passengerId, user.id));

  const myBookingsByOfferId = new Map(
    myBookings
      .filter((b) => offerIds.includes(b.offerId) && b.status !== "cancelled")
      .map((b) => [b.offerId, b]),
  );

  const data = offers.map((offer) => ({
    ...offer,
    myBooking: myBookingsByOfferId.get(offer.id) ?? null,
  }));

  res.json({ data });
});

// POST / — resident creates a carpool offer
carpoolRouter.post("/", async (req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) {
    res.status(400).json({ error: "No estate assigned" });
    return;
  }

  const { origin, destination, departureTime, seatsTotal, fare, notes } =
    req.body as {
      origin: string;
      destination: string;
      departureTime: string;
      seatsTotal?: number;
      fare?: number;
      notes?: string;
    };

  if (!origin?.trim() || !destination?.trim() || !departureTime) {
    res.status(400).json({ error: "origin, destination and departureTime are required" });
    return;
  }

  const departure = new Date(departureTime);
  if (isNaN(departure.getTime()) || departure <= new Date()) {
    res.status(400).json({ error: "departureTime must be a valid future date" });
    return;
  }

  const seats = seatsTotal && seatsTotal > 0 ? seatsTotal : 3;

  const [offer] = await db
    .insert(carpoolOffers)
    .values({
      id: newId(),
      estateId: user.estateId,
      driverId: user.id,
      origin: origin.trim(),
      destination: destination.trim(),
      departureTime: departure,
      seatsTotal: seats,
      seatsAvailable: seats,
      fare: fare != null ? String(fare) : null,
      notes: notes?.trim() ?? null,
      status: "active",
    })
    .returning();

  res.status(201).json({ data: offer });
});

// DELETE /:id — driver cancels their own offer
carpoolRouter.delete("/:id", async (req, res) => {
  const user = res.locals.user!;

  const [offer] = await db
    .select()
    .from(carpoolOffers)
    .where(eq(carpoolOffers.id, req.params.id!))
    .limit(1);

  if (!offer || offer.estateId !== user.estateId) {
    res.status(404).json({ error: "Offer not found" });
    return;
  }
  if (offer.driverId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Only the driver can cancel this offer" });
    return;
  }

  const [updated] = await db
    .update(carpoolOffers)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(carpoolOffers.id, offer.id))
    .returning();

  res.json({ data: updated });
});

// POST /:id/book — passenger books a seat
carpoolRouter.post("/:id/book", async (req, res) => {
  const user = res.locals.user!;

  const [offer] = await db
    .select()
    .from(carpoolOffers)
    .where(eq(carpoolOffers.id, req.params.id!))
    .limit(1);

  if (!offer || offer.estateId !== user.estateId) {
    res.status(404).json({ error: "Offer not found" });
    return;
  }
  if (offer.status !== "active") {
    res.status(400).json({ error: "Offer is not available for booking" });
    return;
  }
  if (offer.driverId === user.id) {
    res.status(400).json({ error: "Driver cannot book their own offer" });
    return;
  }
  if (offer.seatsAvailable < 1) {
    res.status(400).json({ error: "No seats available" });
    return;
  }

  // Check for existing active booking by this user
  const [existing] = await db
    .select()
    .from(carpoolBookings)
    .where(
      and(
        eq(carpoolBookings.offerId, offer.id),
        eq(carpoolBookings.passengerId, user.id),
      ),
    )
    .limit(1);

  if (existing && existing.status !== "cancelled") {
    res.status(400).json({ error: "You already have a booking for this offer" });
    return;
  }

  const [booking] = await db
    .insert(carpoolBookings)
    .values({
      id: newId(),
      offerId: offer.id,
      passengerId: user.id,
      status: "confirmed",
    })
    .returning();

  const newSeatsAvailable = offer.seatsAvailable - 1;
  await db
    .update(carpoolOffers)
    .set({
      seatsAvailable: newSeatsAvailable,
      status: newSeatsAvailable === 0 ? "full" : "active",
      updatedAt: new Date(),
    })
    .where(eq(carpoolOffers.id, offer.id));

  res.status(201).json({ data: booking });
});

// DELETE /:id/book — passenger cancels their booking
carpoolRouter.delete("/:id/book", async (req, res) => {
  const user = res.locals.user!;

  const [offer] = await db
    .select()
    .from(carpoolOffers)
    .where(eq(carpoolOffers.id, req.params.id!))
    .limit(1);

  if (!offer || offer.estateId !== user.estateId) {
    res.status(404).json({ error: "Offer not found" });
    return;
  }

  const [booking] = await db
    .select()
    .from(carpoolBookings)
    .where(
      and(
        eq(carpoolBookings.offerId, offer.id),
        eq(carpoolBookings.passengerId, user.id),
      ),
    )
    .limit(1);

  if (!booking || booking.status === "cancelled") {
    res.status(404).json({ error: "Active booking not found" });
    return;
  }

  await db
    .update(carpoolBookings)
    .set({ status: "cancelled" })
    .where(eq(carpoolBookings.id, booking.id));

  // Restore seat and set offer back to active if it was full
  const newSeatsAvailable = offer.seatsAvailable + 1;
  await db
    .update(carpoolOffers)
    .set({
      seatsAvailable: newSeatsAvailable,
      status: offer.status === "cancelled" ? "cancelled" : "active",
      updatedAt: new Date(),
    })
    .where(eq(carpoolOffers.id, offer.id));

  res.json({ data: { success: true } });
});
