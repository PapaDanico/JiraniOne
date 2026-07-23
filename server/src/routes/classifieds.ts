import { Router } from "express";
import { eq, and, desc, ne } from "drizzle-orm";
import { db } from "../db.js";
import { classifieds } from "@shared/schema.js";
import { createClassifiedSchema, updateClassifiedSchema } from "@shared/validators.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { newId } from "../lib/ids.js";
import { writeAudit } from "../lib/audit.js";

export const classifiedsRouter = Router();
classifiedsRouter.use(requireAuth);

// All residents: browse estate classifieds
classifiedsRouter.get("/", async (_req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) { res.json({ data: [] }); return; }

  const rows = await db.query.classifieds.findMany({
    where: and(
      eq(classifieds.estateId, user.estateId),
      ne(classifieds.status, "closed"),
    ),
    with: {
      user: { columns: { name: true, unitNumber: true, phone: true } },
    },
    orderBy: desc(classifieds.createdAt),
    limit: 100,
  });
  res.json({ data: rows });
});

// Resident: my own listings
classifiedsRouter.get("/my", async (_req, res) => {
  const user = res.locals.user!;
  const rows = await db
    .select()
    .from(classifieds)
    .where(eq(classifieds.userId, user.id))
    .orderBy(desc(classifieds.createdAt))
    .limit(100);
  res.json({ data: rows });
});

// Resident: create a listing
classifiedsRouter.post("/", async (req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) { res.status(400).json({ error: "No estate assigned" }); return; }

  const parsed = createClassifiedSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { title, description, price, category, condition, contactPhone, imageUrl } = parsed.data;

  const [listing] = await db
    .insert(classifieds)
    .values({
      id: newId(),
      estateId: user.estateId,
      userId: user.id,
      title: title.trim(),
      description: description.trim(),
      price: price !== undefined ? String(price) : null,
      category,
      condition: condition ?? null,
      contactPhone: contactPhone ?? null,
      imageUrl: imageUrl ?? null,
      status: "active",
    })
    .returning();

  void writeAudit(req, {
    action: "classified.created",
    targetType: "classified",
    targetId: listing!.id,
    metadata: { category: listing!.category, title: listing!.title },
  });

  res.status(201).json({ data: listing });
});

// Owner: update listing status / details
classifiedsRouter.patch("/:id", async (req, res) => {
  const user = res.locals.user!;
  const parsed = updateClassifiedSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { status, title, description, price } = parsed.data;

  const [listing] = await db
    .select()
    .from(classifieds)
    .where(eq(classifieds.id, req.params.id!))
    .limit(1);

  if (!listing) { res.status(404).json({ error: "Listing not found" }); return; }

  const isOwner = listing.userId === user.id;
  const isAdmin = user.role === "admin" && listing.estateId === user.estateId;
  if (!isOwner && !isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (status) {
    // Once an admin closes a listing (moderation takedown), the owner
    // shouldn't be able to unilaterally reopen it — isOwner alone would
    // otherwise satisfy the authorization check above regardless of who
    // last changed the status.
    if (listing.status === "closed" && !isAdmin) {
      res.status(409).json({ error: "This listing was closed by an admin and can't be reopened" });
      return;
    }
    updates.status = status;
  }
  if (title?.trim()) updates.title = title.trim();
  if (description?.trim()) updates.description = description.trim();
  if (price !== undefined) updates.price = price === null ? null : String(price);

  const [updated] = await db
    .update(classifieds)
    .set(updates)
    .where(eq(classifieds.id, listing.id))
    .returning();

  void writeAudit(req, {
    action: "classified.updated",
    targetType: "classified",
    targetId: listing.id,
    metadata: { previousStatus: listing.status, newStatus: updated!.status },
  });

  res.json({ data: updated });
});

// Owner or Admin: delete listing
classifiedsRouter.delete("/:id", async (req, res) => {
  const user = res.locals.user!;

  const [listing] = await db
    .select()
    .from(classifieds)
    .where(eq(classifieds.id, req.params.id!))
    .limit(1);

  if (!listing) { res.status(404).json({ error: "Not found" }); return; }

  const isOwner = listing.userId === user.id;
  const isAdmin = user.role === "admin" && listing.estateId === user.estateId;
  if (!isOwner && !isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(classifieds).where(eq(classifieds.id, listing.id));

  void writeAudit(req, {
    action: "classified.deleted",
    targetType: "classified",
    targetId: listing.id,
    metadata: { title: listing.title, deletedByRole: user.role },
  });

  res.json({ data: { success: true } });
});
