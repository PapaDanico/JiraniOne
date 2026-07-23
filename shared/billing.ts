// ─────────────────────────────────────────────────────────────────────────────
// JiraniOne subscription pricing — single source of truth.
//
// Revenue model (CLAUDE.md): SaaS, per-estate monthly subscription, tiered
// by unit count. Prices are deliberately a small fraction of what an estate
// already collects in service charges (a 40-unit estate collecting even a
// modest KES 3,000/unit levy handles KES 120,000/month — Starter is ~2% of
// that), so the subscription reads as an operating cost, not a project.
//
// Kenyan-market notes baked into these numbers:
//   - KES, round figures — they get typed into M-PESA reconciliation
//     spreadsheets and read out at AGMs.
//   - Committee-approval friendly: under ~KES 30k/year (Starter) is within
//     most estate committees' discretionary spend, avoiding a full AGM vote
//     to adopt the platform.
//   - Every new estate gets a 30-day full-featured trial (no payment
//     details needed — M-PESA means there's nothing to "put on file").
// ─────────────────────────────────────────────────────────────────────────────

export type SubscriptionTier = "starter" | "growth" | "enterprise";

export interface Plan {
  tier: SubscriptionTier;
  label: string;
  /** Highest unit count this tier covers (Infinity for the top tier). */
  maxUnits: number;
  /** KES per calendar month. */
  monthlyKes: number;
  blurb: string;
}

export const PLANS: Record<SubscriptionTier, Plan> = {
  starter: {
    tier: "starter",
    label: "Starter",
    maxUnits: 40,
    monthlyKes: 2500,
    blurb: "For courts and small gated compounds — up to 40 units.",
  },
  growth: {
    tier: "growth",
    label: "Growth",
    maxUnits: 150,
    monthlyKes: 6500,
    blurb: "For mid-size estates and apartment blocks — 41 to 150 units.",
  },
  enterprise: {
    tier: "enterprise",
    label: "Enterprise",
    maxUnits: Infinity,
    monthlyKes: 15000,
    blurb: "For large estates and multi-phase developments — 151+ units.",
  },
};

/** Days of full-featured free trial for every new estate. */
export const TRIAL_DAYS = 30;

/** Days after invoice issue before it's considered due. */
export const INVOICE_DUE_DAYS = 7;

/** Days past due before an estate moves from past_due to suspended. */
export const GRACE_DAYS = 14;

/**
 * Tier is derived from the estate's unit count, never hand-picked — an
 * estate that grows past a threshold moves up at the next invoice. Unknown
 * or unset unit counts get Starter (smallest plausible estate), not a
 * punitive default.
 */
export function tierForUnits(totalUnits: number | null | undefined): SubscriptionTier {
  const units = totalUnits ?? 0;
  if (units > PLANS.growth.maxUnits) return "enterprise";
  if (units > PLANS.starter.maxUnits) return "growth";
  return "starter";
}

/** "2026-07" — invoice period key, one invoice per estate per period. */
export function periodKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Human-readable period ("July 2026") for invoices and SMS. */
export function periodLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, 1)).toLocaleDateString("en-KE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export type BillingState =
  | "exempt"     // pilot/partner estate — never invoiced
  | "trialing"   // inside the free trial window
  | "active"     // no overdue invoice
  | "past_due"   // unpaid invoice past its due date, inside grace window
  | "suspended"; // unpaid invoice beyond the grace window

/**
 * Pure state derivation — DB stores facts (trial end, invoices), the state
 * is always computed so there's no "status column drifted from reality"
 * class of bug. Suspension is deliberately soft in v1: banners and nags,
 * never disabling resident-facing safety features (SOS, visitors, gate
 * log), and never touching data.
 */
export function computeBillingState(opts: {
  billingExempt: boolean;
  trialEndsAt: Date | string | null;
  /** Due date of the OLDEST unpaid (pending) invoice, if any. */
  oldestUnpaidDueAt: Date | string | null;
  now?: Date;
}): BillingState {
  const now = opts.now ?? new Date();
  if (opts.billingExempt) return "exempt";
  const trialEnd = opts.trialEndsAt ? new Date(opts.trialEndsAt) : null;
  if (trialEnd && now < trialEnd) return "trialing";
  if (!opts.oldestUnpaidDueAt) return "active";
  const due = new Date(opts.oldestUnpaidDueAt);
  if (now <= due) return "active";
  const graceEnd = new Date(due.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000);
  return now <= graceEnd ? "past_due" : "suspended";
}
