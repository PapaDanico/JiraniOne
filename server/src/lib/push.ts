// Web Push fanout — the "proactive push notifications" layer.
//
// VAPID keys come from env (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY, generate
// once with `npx web-push generate-vapid-keys`); unset keys disable push
// entirely and every send becomes a silent no-op, so the feature is safe
// to ship ahead of the keys being configured in Netlify.
//
// Design constraints:
//   - Never let a push failure break the caller — in-app notification
//     rows are the source of truth; push is best-effort delivery.
//   - Serverless-friendly: sends are awaited (a Netlify Function can be
//     frozen right after the response, silently dropping fire-and-forget
//     work), but batched with allSettled and a hard timeout per send.
//   - Expired/revoked subscriptions (404/410 from the push service) are
//     deleted on the spot so dead endpoints don't accumulate.

import { inArray, eq } from "drizzle-orm";
import webpush from "web-push";
import { db } from "../db.js";
import { pushSubscriptions } from "@shared/schema.js";
import { logger } from "./logger.js";
import { SUPPORT_EMAIL } from "@shared/brand.js";

const log = logger.child({ component: "push" });

let configured = false;
export function isPushConfigured(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!configured) {
    webpush.setVapidDetails(`mailto:${SUPPORT_EMAIL}`, pub, priv);
    configured = true;
  }
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  /** In-app path to open when the notification is tapped. */
  linkTo?: string;
  tag?: string;
}

/**
 * Send one payload to every push subscription of the given users.
 * Failures are logged, dead subscriptions pruned, nothing thrown.
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (userIds.length === 0 || !isPushConfigured()) return;

  let subs;
  try {
    subs = await db
      .select()
      .from(pushSubscriptions)
      .where(inArray(pushSubscriptions.userId, userIds))
      .limit(500);
  } catch (err) {
    log.error({ event: "push_sub_lookup_failed", err }, "push subscription lookup failed");
    return;
  }
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body,
        // TTL: if the device is offline, the push service holds the message
        // for up to a day — matches how residents actually use the app
        // (intermittent data, phone off overnight).
        { TTL: 24 * 60 * 60, timeout: 5000 },
      ),
    ),
  );

  const dead: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const statusCode = (r.reason as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        dead.push(subs![i]!.id);
      } else {
        log.warn(
          { event: "push_send_failed", statusCode, endpoint: subs![i]!.endpoint.slice(0, 60) },
          "push send failed",
        );
      }
    }
  });

  if (dead.length > 0) {
    try {
      await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, dead));
    } catch (err) {
      log.error({ event: "push_prune_failed", err }, "failed to prune dead push subscriptions");
    }
  }
}

/** Remove every subscription for one endpoint (device unsubscribed). */
export async function removeSubscriptionByEndpoint(endpoint: string): Promise<void> {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}
