import type { Request } from "express";
import { db } from "../db.js";
import { auditLogs } from "@shared/schema.js";
import { newId } from "./ids.js";
import { logger } from "./logger.js";
import { getClientIp } from "./httpUtils.js";

const log = logger.child({ component: "audit" });

interface AuditEntry {
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Persist an entry to audit_logs. Best-effort: failures are logged but
 * never throw — we don't want the audit subsystem to take down a user-
 * facing request. Caller passes the Request so we can capture actor /
 * IP / role automatically.
 */
export async function writeAudit(
  req: Request,
  entry: AuditEntry,
): Promise<void> {
  try {
    const actor = req.res?.locals.user ?? null;
    await db.insert(auditLogs).values({
      id: newId(),
      actorId: actor?.id ?? null,
      actorRole: actor?.role ?? null,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      estateId: actor?.estateId ?? null,
      metadata: entry.metadata ?? null,
      ip: getClientIp(req) || null,
    });
  } catch (err) {
    log.error({ event: "audit_write_failed", action: entry.action, err }, "audit log write failed");
  }
}
