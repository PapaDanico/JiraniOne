import { Router } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db.js";
import { serviceProviders, serviceReviews, quoteRequests, users } from "@shared/schema.js";
import { createServiceProviderSchema, createReviewSchema, createQuoteRequestSchema, updateQuoteStatusSchema } from "@shared/validators.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { newId } from "../lib/ids.js";
import { createNotification } from "../lib/notify.js";
import { availabilityLabel } from "@shared/marketplace.js";
import { writeAudit } from "../lib/audit.js";

// Recompute a provider's aggregate rating/ratingCount from its reviews —
// called after every review write so the marketplace list (which only
// ever reads the provider row, not the reviews table) stays accurate.
//
// Single atomic UPDATE with correlated subqueries, not a separate SELECT
// then UPDATE — two concurrent reviewers each computing their own snapshot
// of the aggregate and writing it back is a lost-update race (whichever
// UPDATE lands last wins, silently dropping the other's review from the
// stored total). A single statement lets Postgres serialize the reads
// against the writes for this row.
async function recomputeRating(providerId: string) {
  await db.execute(sql`
    UPDATE service_providers
       SET rating = COALESCE(
             (SELECT avg(rating) FROM service_reviews WHERE provider_id = ${providerId}),
             0
           ),
           rating_count = (SELECT count(*) FROM service_reviews WHERE provider_id = ${providerId}),
           updated_at = NOW()
     WHERE id = ${providerId}
  `);
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
  const { name, category, phone, description, experienceYears, rateCard, availability, specializations } = parsed.data;

  const [row] = await db.insert(serviceProviders).values({
    id: newId(),
    estateId: user.estateId,
    userId: user.id,
    name,
    category,
    phone,
    description: description ?? null,
    experienceYears: experienceYears ?? null,
    rateCard: rateCard ?? null,
    availability: availability ?? null,
    specializations: specializations ?? [],
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

// ─── Quote requests ──────────────────────────────────────────────────────────

// Resident: request a quote from a provider. Structured job details land
// as a notification on the owning vendor's account (rides Web Push).
servicesRouter.post("/:id/quote", requireRole("resident"), async (req, res) => {
  const user = res.locals.user!;
  const parsed = createQuoteRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const [provider] = await db.select().from(serviceProviders)
    .where(and(eq(serviceProviders.id, req.params['id']!), eq(serviceProviders.estateId, user.estateId!)))
    .limit(1);
  if (!provider) { res.status(404).json({ error: "Provider not found" }); return; }

  const [row] = await db.insert(quoteRequests).values({
    id: newId(),
    estateId: user.estateId!,
    providerId: provider.id,
    residentId: user.id,
    category: provider.category,
    description: parsed.data.description,
    timing: parsed.data.timing ?? null,
  }).returning();

  // Notify the owning vendor account (a provider added by an admin has no
  // userId — nobody to notify, the resident still has the phone number).
  if (provider.userId) {
    const timingLine = parsed.data.timing ? ` · Needed: ${availabilityLabel(parsed.data.timing)}` : "";
    await createNotification({
      userId: provider.userId,
      title: `New quote request — ${provider.category}`,
      body: `${user.name}: ${parsed.data.description.slice(0, 140)}${timingLine}`,
      type: "quote_request",
      linkTo: "/dashboard/vendor",
    });
  }

  void writeAudit(req, {
    action: "quote.requested",
    targetType: "service_provider",
    targetId: provider.id,
    metadata: { timing: parsed.data.timing },
  });

  res.status(201).json({ data: { id: row!.id } });
});

// Vendor: quote requests across all my listings, newest first.
servicesRouter.get("/quotes/mine", requireRole("vendor"), async (_req, res) => {
  const user = res.locals.user!;
  const rows = await db
    .select({
      id: quoteRequests.id,
      category: quoteRequests.category,
      description: quoteRequests.description,
      timing: quoteRequests.timing,
      status: quoteRequests.status,
      createdAt: quoteRequests.createdAt,
      providerName: serviceProviders.name,
      resident: { name: users.name, unitNumber: users.unitNumber, phone: users.phone },
    })
    .from(quoteRequests)
    .innerJoin(serviceProviders, eq(serviceProviders.id, quoteRequests.providerId))
    .innerJoin(users, eq(users.id, quoteRequests.residentId))
    .where(eq(serviceProviders.userId, user.id))
    .orderBy(desc(quoteRequests.createdAt))
    .limit(50);
  res.json({ data: rows });
});

// Admin: all quote activity across the estate — visibility that the
// marketplace is being used, and which providers are getting demand.
servicesRouter.get("/quotes/estate", requireRole("admin"), async (_req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) { res.json({ data: [] }); return; }
  const rows = await db
    .select({
      id: quoteRequests.id,
      category: quoteRequests.category,
      status: quoteRequests.status,
      createdAt: quoteRequests.createdAt,
      providerName: serviceProviders.name,
      residentName: users.name,
    })
    .from(quoteRequests)
    .innerJoin(serviceProviders, eq(serviceProviders.id, quoteRequests.providerId))
    .innerJoin(users, eq(users.id, quoteRequests.residentId))
    .where(eq(quoteRequests.estateId, user.estateId))
    .orderBy(desc(quoteRequests.createdAt))
    .limit(50);
  res.json({ data: rows });
});

// Vendor: update a quote's status (only quotes on my own listings).
servicesRouter.patch("/quotes/:id", requireRole("vendor"), async (req, res) => {
  const user = res.locals.user!;
  const parsed = updateQuoteStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  // Ownership check via the join — a vendor can only touch quotes on
  // providers they own.
  const [quote] = await db
    .select({ id: quoteRequests.id, residentId: quoteRequests.residentId, category: quoteRequests.category })
    .from(quoteRequests)
    .innerJoin(serviceProviders, eq(serviceProviders.id, quoteRequests.providerId))
    .where(and(eq(quoteRequests.id, req.params['id']!), eq(serviceProviders.userId, user.id)))
    .limit(1);
  if (!quote) { res.status(404).json({ error: "Quote not found" }); return; }

  await db.update(quoteRequests)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(quoteRequests.id, quote.id));

  // Tell the resident when the vendor responds/accepts — the loop closes
  // in-app instead of "did they see my request?".
  if (parsed.data.status === "responded" || parsed.data.status === "accepted") {
    await createNotification({
      userId: quote.residentId,
      title: parsed.data.status === "accepted" ? "Quote accepted" : "A vendor responded",
      body: `${user.name} ${parsed.data.status === "accepted" ? "accepted" : "responded to"} your ${quote.category} request. Give them a call to arrange the job.`,
      type: "quote_request",
      linkTo: "/marketplace",
    });
  }

  res.json({ data: { success: true } });
});
