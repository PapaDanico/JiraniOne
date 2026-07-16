import { Router } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db } from "../db.js";
import { emergencyAlerts, users } from "@shared/schema.js";
import { emergencyAlertSchema, updateEmergencyStatusSchema } from "@shared/validators.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { newId } from "../lib/ids.js";

export const emergencyRouter = Router();
emergencyRouter.use(requireAuth);

// Any resident/security: raise alert
emergencyRouter.post("/", async (req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) { res.status(400).json({ error: "No estate assigned" }); return; }

  const parsed = emergencyAlertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const [alert] = await db.insert(emergencyAlerts).values({
    id: newId(),
    userId: user.id,
    estateId: user.estateId,
    type: parsed.data.type,
    description: parsed.data.description ?? null,
    locationLat: parsed.data.locationLat ? String(parsed.data.locationLat) : null,
    locationLng: parsed.data.locationLng ? String(parsed.data.locationLng) : null,
    status: "active",
  }).returning();

  res.status(201).json({ data: alert });
});

// Admin/Security: list active alerts
emergencyRouter.get("/", requireRole("admin", "security"), async (_req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) { res.json({ data: [] }); return; }

  const rows = await db
    .select({
      id: emergencyAlerts.id,
      userId: emergencyAlerts.userId,
      estateId: emergencyAlerts.estateId,
      type: emergencyAlerts.type,
      description: emergencyAlerts.description,
      locationLat: emergencyAlerts.locationLat,
      locationLng: emergencyAlerts.locationLng,
      status: emergencyAlerts.status,
      resolvedAt: emergencyAlerts.resolvedAt,
      createdAt: emergencyAlerts.createdAt,
      updatedAt: emergencyAlerts.updatedAt,
      userName: users.name,
      userPhone: users.phone,
    })
    .from(emergencyAlerts)
    .innerJoin(users, eq(emergencyAlerts.userId, users.id))
    .where(eq(emergencyAlerts.estateId, user.estateId))
    .orderBy(desc(emergencyAlerts.createdAt))
    .limit(100);

  res.json({ data: rows });
});

// Admin/Security: update alert status
emergencyRouter.patch("/:id", requireRole("admin", "security"), async (req, res) => {
  const user = res.locals.user!;
  const parsed = updateEmergencyStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { status } = parsed.data;

  const [existing] = await db.select().from(emergencyAlerts)
    .where(and(
      eq(emergencyAlerts.id, req.params['id']!),
      eq(emergencyAlerts.estateId, user.estateId!),
    )).limit(1);

  if (!existing) { res.status(404).json({ error: "Alert not found" }); return; }

  const [updated] = await db.update(emergencyAlerts)
    .set({
      status,
      resolvedAt: status === "resolved" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(emergencyAlerts.id, req.params['id']!))
    .returning();

  res.json({ data: updated });
});
