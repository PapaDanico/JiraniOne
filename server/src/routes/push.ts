import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { pushSubscriptions } from "@shared/schema.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { newId } from "../lib/ids.js";
import { isPushConfigured, removeSubscriptionByEndpoint } from "../lib/push.js";

export const pushRouter = Router();

// Public — the client needs the VAPID public key before it can subscribe.
// Returns { key: null } when push isn't configured so the UI can hide the
// opt-in instead of failing.
pushRouter.get("/vapid-public-key", (_req, res) => {
  res.json({
    data: { key: isPushConfigured() ? process.env.VAPID_PUBLIC_KEY! : null },
  });
});

pushRouter.use(requireAuth);

const subscribeSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({
    p256dh: z.string().min(10).max(300),
    auth: z.string().min(10).max(100),
  }),
});

// Register (or refresh) this device's push subscription. Upserts on the
// endpoint: the same browser re-subscribing (new session, key rotation by
// the push service) replaces its row, and a device handed to a different
// account moves to the new user instead of pushing to the old one.
pushRouter.post("/subscribe", async (req, res) => {
  const user = res.locals.user!;
  const parsed = subscribeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid subscription", details: parsed.error.flatten() });
    return;
  }
  const { endpoint, keys } = parsed.data;

  await db
    .insert(pushSubscriptions)
    .values({
      id: newId(),
      userId: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: (req.headers["user-agent"] ?? "").slice(0, 300) || null,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId: user.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

  res.status(201).json({ data: { ok: true } });
});

// Drop this device's subscription (user toggled push off).
pushRouter.post("/unsubscribe", async (req, res) => {
  const endpoint = typeof req.body?.endpoint === "string" ? req.body.endpoint : null;
  if (!endpoint || endpoint.length > 1000) {
    res.status(400).json({ error: "Invalid endpoint" });
    return;
  }
  await removeSubscriptionByEndpoint(endpoint);
  res.json({ data: { ok: true } });
});
