import { Router } from "express";
import { eq, count, sum, and, gte } from "drizzle-orm";
import { db } from "../db.js";
import {
  users,
  payments,
  maintenanceTickets,
  visitors,
  parcels,
  emergencyAlerts,
} from "@shared/schema.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);
analyticsRouter.use(requireRole("admin"));

// GET / — return EstateAnalytics object
analyticsRouter.get("/", async (_req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) {
    res.status(400).json({ error: "No estate assigned" });
    return;
  }

  const estateId = user.estateId;

  // Build date boundaries
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Six-month window start (first day, 6 months back)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    allUsers,
    allPayments,
    allTickets,
    visitorTotal,
    visitorThisMonth,
    parcelAtGate,
    parcelThisMonth,
    emergencyActive,
    emergencyThisMonth,
  ] = await Promise.all([
    // All non-deleted users for this estate
    db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(and(eq(users.estateId, estateId))),

    // Last 6 months of completed payments for grouping
    db
      .select({
        type: payments.type,
        amount: payments.amount,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(
        and(
          eq(payments.estateId, estateId),
          eq(payments.status, "completed"),
          gte(payments.createdAt, sixMonthsAgo),
        ),
      ),

    // All tickets
    db
      .select({ status: maintenanceTickets.status, category: maintenanceTickets.category })
      .from(maintenanceTickets)
      .where(eq(maintenanceTickets.estateId, estateId)),

    // Visitors total count
    db
      .select({ value: count() })
      .from(visitors)
      .where(eq(visitors.estateId, estateId))
      .then((r) => r[0]?.value ?? 0),

    // Visitors this month
    db
      .select({ value: count() })
      .from(visitors)
      .where(
        and(
          eq(visitors.estateId, estateId),
          gte(visitors.createdAt, startOfMonth),
        ),
      )
      .then((r) => r[0]?.value ?? 0),

    // Parcels currently at gate
    db
      .select({ value: count() })
      .from(parcels)
      .where(
        and(
          eq(parcels.estateId, estateId),
          eq(parcels.status, "at_gate"),
        ),
      )
      .then((r) => r[0]?.value ?? 0),

    // Parcels received this month
    db
      .select({ value: count() })
      .from(parcels)
      .where(
        and(
          eq(parcels.estateId, estateId),
          gte(parcels.createdAt, startOfMonth),
        ),
      )
      .then((r) => r[0]?.value ?? 0),

    // Active emergency alerts
    db
      .select({ value: count() })
      .from(emergencyAlerts)
      .where(
        and(
          eq(emergencyAlerts.estateId, estateId),
          eq(emergencyAlerts.status, "active"),
        ),
      )
      .then((r) => r[0]?.value ?? 0),

    // Emergency alerts this month
    db
      .select({ value: count() })
      .from(emergencyAlerts)
      .where(
        and(
          eq(emergencyAlerts.estateId, estateId),
          gte(emergencyAlerts.createdAt, startOfMonth),
        ),
      )
      .then((r) => r[0]?.value ?? 0),
  ]);

  // ── Residents ──────────────────────────────────────────────────────────────
  const byRole: Record<string, number> = {};
  for (const u of allUsers) {
    byRole[u.role] = (byRole[u.role] ?? 0) + 1;
  }

  const residents = {
    total: allUsers.length,
    byRole: {
      resident: byRole["resident"] ?? 0,
      security: byRole["security"] ?? 0,
      vendor: byRole["vendor"] ?? 0,
      admin: byRole["admin"] ?? 0,
    },
  };

  // ── Payments ───────────────────────────────────────────────────────────────
  // totalCollected = sum of all completed payments in the 6-month window
  let totalCollected = 0;
  const byType: Record<string, number> = {};
  // Map from "YYYY-MM" -> running total
  const monthMap = new Map<string, number>();

  // Initialise all 6 month slots in order (oldest first)
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, 0);
  }

  for (const p of allPayments) {
    const amt = Number(p.amount);
    totalCollected += amt;
    byType[p.type] = (byType[p.type] ?? 0) + amt;

    const d = new Date(p.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthMap.has(key)) {
      monthMap.set(key, (monthMap.get(key) ?? 0) + amt);
    }
  }

  const monthlyTotals = Array.from(monthMap.entries()).map(([month, total]) => ({
    month,
    total: Math.round(total * 100) / 100,
  }));

  const paymentsAnalytics = {
    totalCollected: Math.round(totalCollected * 100) / 100,
    monthlyTotals,
    byType,
  };

  // ── Maintenance ────────────────────────────────────────────────────────────
  let open = 0;
  let inProgress = 0;
  let resolved = 0;
  const byCategory: Record<string, number> = {};

  for (const t of allTickets) {
    if (t.status === "open" || t.status === "assigned") open++;
    else if (t.status === "in_progress") inProgress++;
    else if (t.status === "resolved" || t.status === "closed") resolved++;

    byCategory[t.category] = (byCategory[t.category] ?? 0) + 1;
  }

  const maintenance = {
    total: allTickets.length,
    open,
    inProgress,
    resolved,
    byCategory,
  };

  // ── Final response ─────────────────────────────────────────────────────────
  res.json({
    data: {
      residents,
      payments: paymentsAnalytics,
      maintenance,
      visitors: {
        total: Number(visitorTotal),
        thisMonth: Number(visitorThisMonth),
      },
      parcels: {
        atGate: Number(parcelAtGate),
        thisMonth: Number(parcelThisMonth),
      },
      emergency: {
        active: Number(emergencyActive),
        thisMonth: Number(emergencyThisMonth),
      },
    },
  });
});
