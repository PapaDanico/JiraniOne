import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { BRAND_NAME } from "@shared/brand";

export interface BillingInvoice {
  id: string;
  period: string;
  tier: string;
  amount: string;
  status: "pending" | "paid" | "waived" | "cancelled";
  dueDate: string;
  paidAt: string | null;
  mpesaRef: string | null;
}

export interface BillingInfo {
  plan: { tier: string; label: string; monthlyKes: number; blurb: string };
  state: "exempt" | "trialing" | "active" | "past_due" | "suspended";
  trialEndsAt: string | null;
  trialDays: number;
  currentInvoice: BillingInvoice | null;
  invoices: BillingInvoice[];
}

export function useBilling() {
  return useQuery({
    queryKey: ["billing"],
    queryFn: () => api.get<BillingInfo>("/api/billing").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

const STATE_BADGE: Record<BillingInfo["state"], { label: string; cls: string }> = {
  exempt:    { label: "Partner estate",  cls: "bg-brand-green/10 text-brand-green" },
  trialing:  { label: "Free trial",      cls: "bg-brand-gold/15 text-brand-gold-dark" },
  active:    { label: "Active",          cls: "bg-brand-green/10 text-brand-green" },
  past_due:  { label: "Payment overdue", cls: "bg-brand-red/10 text-brand-red" },
  suspended: { label: "Suspended",       cls: "bg-brand-red text-white" },
};

function fmtKes(v: string | number): string {
  return `KES ${Number(v).toLocaleString("en-KE")}`;
}

function periodName(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, 1)).toLocaleDateString("en-KE", {
    month: "long", year: "numeric", timeZone: "UTC",
  });
}

// "Your plan" — the estate's own subscription to the platform. Lives in
// admin settings; nothing here is resident-facing.
export function BillingCard() {
  const qc = useQueryClient();
  const { data: billing } = useBilling();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pay = useMutation({
    mutationFn: () => api.post<{ paymentId: string; stub?: boolean }>("/api/billing/pay", {}),
    onSuccess: (r) => {
      setError(null);
      setMsg(
        r.data.stub
          ? "Payment recorded (dev stub)."
          : "M-PESA prompt sent to your phone — enter your PIN to complete payment. This page updates once it settles.",
      );
      // The invoice flips to paid via the M-PESA callback; refresh shortly
      // after and again on the regular polling cycle.
      setTimeout(() => qc.invalidateQueries({ queryKey: ["billing"] }), 5000);
      qc.invalidateQueries({ queryKey: ["billing"] });
    },
    onError: (e) => {
      setMsg(null);
      setError(e instanceof ApiError ? e.message : "Payment failed to start.");
    },
  });

  if (!billing) return null;
  const badge = STATE_BADGE[billing.state];
  const trialDaysLeft = billing.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(billing.trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;

  return (
    <div className="tribal-card p-5 space-y-4 max-w-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-brand-green" />
          </div>
          <div>
            <p className="font-display font-bold text-sm text-tribal-charcoal">
              {billing.plan.label} plan — {fmtKes(billing.plan.monthlyKes)}/month
            </p>
            <p className="text-xs text-tribal-earth">{billing.plan.blurb}</p>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {billing.state === "trialing" && trialDaysLeft !== null && (
        <p className="text-sm text-tribal-earth bg-brand-gold/10 rounded-xl px-3 py-2">
          Your free trial has <strong>{trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"}</strong> left.
          Billing starts automatically afterwards — no action needed today.
        </p>
      )}

      {billing.currentInvoice && (
        <div className="rounded-xl border border-tribal-cream-dark p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-tribal-charcoal">
                {periodName(billing.currentInvoice.period)} — {fmtKes(billing.currentInvoice.amount)}
              </p>
              <p className="text-xs text-tribal-earth">
                Due {new Date(billing.currentInvoice.dueDate).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => pay.mutate()} loading={pay.isPending}>
              <Smartphone className="h-4 w-4" /> Pay via M-PESA
            </Button>
          </div>
        </div>
      )}

      {msg && <p className="text-sm text-brand-green bg-brand-green/10 rounded-xl px-3 py-2">✓ {msg}</p>}
      {error && <p className="text-sm text-brand-red bg-brand-red/10 rounded-xl px-3 py-2">{error}</p>}

      {billing.invoices.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-tribal-earth uppercase tracking-wide mb-2">Invoice history</p>
          <div className="space-y-1.5">
            {billing.invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between text-sm">
                <span className="text-tribal-charcoal">{periodName(inv.period)}</span>
                <span className="text-tribal-earth">{fmtKes(inv.amount)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  inv.status === "paid" ? "bg-brand-green/10 text-brand-green"
                  : inv.status === "pending" ? "bg-brand-gold/15 text-brand-gold-dark"
                  : "bg-tribal-cream-dark text-tribal-earth"
                }`}>
                  {inv.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-tribal-earth">
        Pricing is tied to your unit count — update it under Estate details
        and your plan adjusts at the next invoice. Your {BRAND_NAME} data is
        never deleted over billing; safety features (SOS, visitor gate) stay
        on regardless.
      </p>
    </div>
  );
}

// Compact dashboard banner — only renders when billing needs attention
// (trial ending within 7 days, overdue, or suspended).
export function BillingBanner() {
  const { data: billing } = useBilling();
  if (!billing) return null;

  const trialDaysLeft = billing.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(billing.trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;

  let text: string | null = null;
  let urgent = false;
  if (billing.state === "trialing" && trialDaysLeft !== null && trialDaysLeft <= 7) {
    text = `Your free trial ends in ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} — your first invoice arrives after that.`;
  } else if (billing.state === "past_due") {
    text = "Your subscription payment is overdue. Please pay via M-PESA to keep the estate in good standing.";
    urgent = true;
  } else if (billing.state === "suspended") {
    text = "Your subscription is suspended for non-payment. Pay now to restore good standing — your data is intact.";
    urgent = true;
  }
  if (!text) return null;

  return (
    <a
      href="/admin/settings"
      className={`block tribal-card p-4 border-l-4 ${urgent ? "border-l-brand-red" : "border-l-brand-gold"}`}
    >
      <p className="text-sm font-semibold text-tribal-charcoal">{text}</p>
      <p className="text-xs text-tribal-earth mt-1">Open Estate Settings → Your plan</p>
    </a>
  );
}
