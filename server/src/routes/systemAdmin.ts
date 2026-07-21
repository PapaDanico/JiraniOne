import { Router } from "express";
import { desc } from "drizzle-orm";
import { db } from "../db.js";
import { errorLogs } from "@shared/schema.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requirePlatformOwner } from "../middleware/requirePlatformOwner.js";

export const systemAdminRouter = Router();
systemAdminRouter.use(requireAuth, requirePlatformOwner);

// Most-recent-first, capped — this is a quick-triage view, not a full log
// export. Old rows are pruned in daily-cleanup (server/src/cron.ts).
systemAdminRouter.get("/error-logs", async (_req, res) => {
  const rows = await db
    .select()
    .from(errorLogs)
    .orderBy(desc(errorLogs.createdAt))
    .limit(200);
  res.json({ data: rows });
});
