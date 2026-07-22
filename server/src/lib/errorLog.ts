import { and, eq, gt } from "drizzle-orm";
import { db } from "../db.js";
import { errorLogs, users, notifications } from "@shared/schema.js";
import { newId } from "./ids.js";
import { logger } from "./logger.js";
import { createNotification } from "./notify.js";

// In-app alert to the platform owner when a new server error lands, so the
// error-logs viewer is proactive rather than something to remember to
// check. Throttled: at most one alert per 30 minutes — an error storm
// (e.g. DB down, every request failing) must not bury the owner's
// notifications in hundreds of duplicates.
const ALERT_THROTTLE_MS = 30 * 60 * 1000;

async function alertPlatformOwner(message: string): Promise<void> {
  const ownerPhone = process.env.PLATFORM_OWNER_PHONE;
  if (!ownerPhone) return;

  const [owner] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phone, ownerPhone))
    .limit(1);
  if (!owner) return;

  const [recent] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(
      eq(notifications.userId, owner.id),
      eq(notifications.type, "system_error"),
      gt(notifications.createdAt, new Date(Date.now() - ALERT_THROTTLE_MS)),
    ))
    .limit(1);
  if (recent) return;

  await createNotification({
    userId: owner.id,
    title: "Server error logged",
    body: message.slice(0, 200),
    type: "system_error",
    linkTo: "/admin/system/error-logs",
  });
}

interface ErrorLogContext {
  path?: string;
  method?: string;
  userId?: string | null;
  estateId?: string | null;
}

// Best-effort — a DB write failing here must never affect the 500 already
// being sent to the client, so every failure is swallowed and only logged
// to stdout (which every other error already goes to via pino).
export async function logErrorToDb(err: unknown, context: ErrorLogContext = {}): Promise<void> {
  try {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack ?? null : null;

    await db.insert(errorLogs).values({
      id: newId(),
      message: message.slice(0, 2000),
      stack: stack?.slice(0, 8000) ?? null,
      path: context.path?.slice(0, 300),
      method: context.method,
      userId: context.userId ?? null,
      estateId: context.estateId ?? null,
    });

    await alertPlatformOwner(message);
  } catch (writeErr) {
    logger.error({ writeErr }, "failed to persist error log");
  }
}
