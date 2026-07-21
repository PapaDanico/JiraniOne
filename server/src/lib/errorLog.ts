import { db } from "../db.js";
import { errorLogs } from "@shared/schema.js";
import { newId } from "./ids.js";
import { logger } from "./logger.js";

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
  } catch (writeErr) {
    logger.error({ writeErr }, "failed to persist error log");
  }
}
