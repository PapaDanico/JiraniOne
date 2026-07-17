import { Router } from "express";
import { eq, desc, and, inArray } from "drizzle-orm";
import { db } from "../db.js";
import { emergencyAlerts, users } from "@shared/schema.js";
import { emergencyAlertSchema, updateEmergencyStatusSchema } from "@shared/validators.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { newId } from "../lib/ids.js";
import { sendThrottledSms } from "../lib/sms.js";
import { logger } from "../lib/logger.js";

const ALERT_LABEL: Record<string, string> = {
  medical: "MEDICAL",
  fire: "FIRE",
  security: "SECURITY",
  accident: "ACCIDENT",
  other: "EMERGENCY",
};

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

  // SMS fallback for admin/security — the app polls every ~5s for active
  // alerts, but on Netlify Functions there's no push channel, and this is
  // exactly the case (someone in danger, possibly with no data connection
  // of their own) CLAUDE.md's "SMS fallback for all critical notifications"
  // principle exists for. Fired after responding to the reporter so their
  // confirmation isn't held up by SMS latency, but still awaited (not
  // fire-and-forget) since a serverless function can be frozen the instant
  // after the response is sent.
  try {
    const responders = await db
      .select({ id: users.id, phone: users.phone })
      .from(users)
      .where(and(eq(users.estateId, user.estateId), inArray(users.role, ["admin", "security"])));

    if (responders.length > 0) {
      const label = ALERT_LABEL[parsed.data.type] ?? "EMERGENCY";
      const message = `JiraniHub ALERT: ${label} reported by ${user.name} (${user.phone}). Check the app now.`;
      await Promise.all(
        responders.map((r) =>
          sendThrottledSms({ userId: r.id, to: r.phone, message, systemMessage: true })
            .catch((err) => {
              logger.error({ err, userId: r.id }, "emergency alert sms failed");
              return null;
            }),
        ),
      );
    }
  } catch (err) {
    logger.error({ err, alertId: alert!.id }, "emergency alert sms fan-out failed");
  }
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
