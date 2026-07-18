import { Router } from "express";
import { eq, and, avg, count, desc } from "drizzle-orm";
import { db } from "../db.js";
import { serviceProviders, serviceReviews, users } from "@shared/schema.js";
import { createServiceProviderSchema, createReviewSchema } from "@shared/validators.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { newId } from "../lib/ids.js";

// Recompute a provider's aggregate rating/ratingCount from its reviews —
// called after every review write so the marketplace list (which only
// ever reads the provider row, not the reviews table) stays accurate.
async function recomputeRating(providerId: string) {
  const [agg] = await db
    .select({ avgRating: avg(serviceReviews.rating), cnt: count() })
    .from(serviceReviews)
    .where(eq(serviceReviews.providerId, providerId));
  await db.update(serviceProviders)
    .set({
      rating: agg?.avgRating ?? "0",
      ratingCount: agg?.cnt ?? 0,
      updatedAt: new Date(),
    })
    .where(eq(serviceProviders.id, providerId));
}

export const servicesRouter = Router();
servicesRouter.use(requireAuth);

// List estate service providers
servicesRouter.get("/", async (_req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) { res.json({ data: [] }); return; }
  const rows = await db.select().from(serviceProviders)
    .where(eq(serviceProviders.estateId, user.estateId))
    .orderBy(serviceProviders.category, serviceProviders.name);
  res.json({ data: rows });
});

// Admin/Vendor: add provider
servicesRouter.post("/", requireRole("admin", "vendor"), async (req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) { res.status(400).json({ error: "No estate assigned" }); return; }

  const parsed = createServiceProviderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { name, category, phone, description } = parsed.data;

  const [row] = await db.insert(serviceProviders).values({
    id: newId(),
    estateId: user.estateId,
    userId: user.id,
    name,
    category,
    phone,
    description: description ?? null,
  }).returning();
  res.status(201).json({ data: row });
});

// Admin: verify/update provider
servicesRouter.patch("/:id", requireRole("admin"), async (req, res) => {
  const user = res.locals.user!;
  const [existing] = await db.select().from(serviceProviders)
    .where(and(
      eq(serviceProviders.id, req.params['id']!),
      eq(serviceProviders.estateId, user.estateId!),
    )).limit(1);
  if (!existing) { res.status(404).json({ error: "Provider not found" }); return; }

  // Explicit allow-list — `rating`/`ratingCount` are derived from reviews
  // (not implemented yet) and `userId` is the owning vendor; none of those
  // should be settable by a raw PATCH body.
  const body = req.body as {
    name?: string; category?: string; phone?: string;
    description?: string | null; verified?: boolean;
  };
  const updates: Partial<typeof existing> = { updatedAt: new Date() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.category !== undefined) updates.category = body.category;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.description !== undefined) updates.description = body.description;
  if (body.verified !== undefined) updates.verified = body.verified;

  const [updated] = await db.update(serviceProviders)
    .set(updates)
    .where(eq(serviceProviders.id, req.params['id']!))
    .returning();
  res.json({ data: updated });
});

// Admin: delete provider
servicesRouter.delete("/:id", requireRole("admin"), async (req, res) => {
  const user = res.locals.user!;
  const [existing] = await db.select().from(serviceProviders)
    .where(and(
      eq(serviceProviders.id, req.params['id']!),
      eq(serviceProviders.estateId, user.estateId!),
    )).limit(1);
  if (!existing) { res.status(404).json({ error: "Provider not found" }); return; }
  await db.delete(serviceProviders).where(eq(serviceProviders.id, req.params['id']!));
  res.json({ data: { success: true } });
});

// List reviews for a provider — newest first, with reviewer name + unit.
servicesRouter.get("/:id/reviews", async (req, res) => {
  const user = res.locals.user!;
  const [provider] = await db.select({ id: serviceProviders.id }).from(serviceProviders)
    .where(and(eq(serviceProviders.id, req.params['id']!), eq(serviceProviders.estateId, user.estateId!))).limit(1);
  if (!provider) { res.status(404).json({ error: "Provider not found" }); return; }

  const rows = await db
    .select({
      id: serviceReviews.id,
      rating: serviceReviews.rating,
      comment: serviceReviews.comment,
      createdAt: serviceReviews.createdAt,
      reviewer: { name: users.name, unitNumber: users.unitNumber },
    })
    .from(serviceReviews)
    .innerJoin(users, eq(users.id, serviceReviews.userId))
    .where(eq(serviceReviews.providerId, provider.id))
    .orderBy(desc(serviceReviews.createdAt));

  res.json({ data: rows });
});

// Resident: rate a provider — upsert (rethink your rating, don't spam
// duplicates) then recompute the provider's aggregate rating/ratingCount.
servicesRouter.post("/:id/reviews", requireRole("resident"), async (req, res) => {
  const user = res.locals.user!;
  const parsed = createReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const [provider] = await db.select({ id: serviceProviders.id }).from(serviceProviders)
    .where(and(eq(serviceProviders.id, req.params['id']!), eq(serviceProviders.estateId, user.estateId!))).limit(1);
  if (!provider) { res.status(404).json({ error: "Provider not found" }); return; }

  await db.insert(serviceReviews)
    .values({
      id: newId(),
      providerId: provider.id,
      userId: user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
    })
    .onConflictDoUpdate({
      target: [serviceReviews.providerId, serviceReviews.userId],
      set: { rating: parsed.data.rating, comment: parsed.data.comment ?? null, updatedAt: new Date() },
    });

  await recomputeRating(provider.id);
  res.status(201).json({ data: { success: true } });
});
