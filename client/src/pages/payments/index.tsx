import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, CheckCircle, Clock, XCircle, Heart, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEstate } from "@/hooks/useEstate";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SectionLoader } from "@/components/shared/loading";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, formatDate } from "@/lib/utils";
import type { Payment, FundraisingCampaign } from "@shared/types";

const STATUS_ICON = {
  completed: <CheckCircle className="h-4 w-4 text-[#1B5E20]" />,
  pending:   <Clock className="h-4 w-4 text-amber-500" />,
  failed:    <XCircle className="h-4 w-4 text-[#B71C1C]" />,
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "default"> = {
  completed: "success", pending: "warning", failed: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  completed: "Paid", pending: "Pending", failed: "Failed",
};

interface LevyArrears {
  monthlyLevy: number | null;
  monthsChecked: number;
  monthsBehind: number;
  amountOwed: number | null;
}

function useLevyArrears() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["levy-arrears"],
    queryFn: () => api.get<LevyArrears | null>("/api/payments/levy-arrears").then((r) => r.data),
    enabled: !!user?.estateId && user.role === "resident",
    staleTime: 5 * 60 * 1000,
  });
}

function PayDialog({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { data: estate } = useEstate();
  const qc = useQueryClient();
  // Prefill with the estate's standard levy — the whole point of the
  // preset is that most residents just tap "Pay" without typing anything.
  const [amount, setAmount] = useState(() => "");
  const levyPreset = estate?.monthlyLevy ? String(Math.round(Number(estate.monthlyLevy))) : "";
  const effectiveAmount = amount || levyPreset;
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.post<{ message?: string; stub?: boolean }>("/api/payments/stk-push", {
        amount: Math.trunc(Number(effectiveAmount)),
        type: "levy",
        description: "Monthly levy",
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["levy-arrears"] });
      setError(null);
      setMsg(
        res.data.message ??
        (res.data.stub ? "Test mode: payment recorded." : "Check your phone for the M-PESA prompt."),
      );
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Payment failed to start. Please try again.");
    },
  });

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-xl bg-[#1B5E20] flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle>Pay Monthly Levy</DialogTitle>
              <p className="text-xs text-[#6B5D45] mt-0.5">Payment via M-PESA</p>
            </div>
          </div>
        </DialogHeader>
        <div className="px-6 pb-2 space-y-4">
          <div className="tribal-card p-3">
            <p className="text-xs text-[#6B5D45]">M-PESA Phone</p>
            <p className="font-bold text-[#212121]">{user?.phone}</p>
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Amount (KES)</Label>
            <Input
              type="number"
              min={1}
              value={effectiveAmount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={levyPreset ? undefined : "e.g. 5000"}
            />
            {levyPreset && (
              <p className="text-xs text-[#6B5D45] mt-1">
                Your estate&apos;s standard levy is KES {Number(levyPreset).toLocaleString()}/month — adjust if you&apos;re paying a different amount.
              </p>
            )}
          </div>
          {msg && (
            <div className="bg-[#1B5E20]/8 border border-[#1B5E20]/20 rounded-xl px-4 py-3 text-sm text-[#1B5E20] font-medium">
              ✓ {msg}
            </div>
          )}
          {error && (
            <div className="bg-[#B71C1C]/10 border border-[#B71C1C]/30 rounded-xl px-4 py-3 text-sm text-[#B71C1C] font-medium">
              {error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {!msg && (
            <Button
              onClick={() => mutation.mutate()}
              loading={mutation.isPending}
              disabled={!effectiveAmount || Number(effectiveAmount) < 1}
            >
              Pay KES {effectiveAmount ? Number(effectiveAmount).toLocaleString() : "—"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const [payOpen, setPayOpen] = useState(false);
  const isAdmin = user?.role === "admin";
  const { data: arrears } = useLevyArrears();

  const { data: myPayments, isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: () =>
      api.get<Payment[]>(isAdmin ? "/api/payments/estate" : "/api/payments/my").then((r) => r.data),
  });

  const { data: campaigns } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => api.get<FundraisingCampaign[]>("/api/payments/campaigns").then((r) => r.data),
  });

  return (
    <div className="page-wrap" data-bottomnav="true">
      <TopBar title="Payments" />
      <main className="container-list pt-4 space-y-6 page-content">

        {/* Arrears reminder — only when the estate has set a standard levy
            AND the resident has unpaid months in the 6-month window. */}
        {arrears && arrears.monthlyLevy != null && arrears.monthsBehind > 0 && (
          <button
            onClick={() => setPayOpen(true)}
            className={`w-full text-left tribal-card p-4 border-l-4 ${arrears.monthsBehind >= 2 ? "border-l-[#B71C1C]" : "border-l-[#D47A00]"}`}
          >
            <p className="text-sm font-semibold text-[#212121]">
              {arrears.monthsBehind >= 2
                ? `You're ${arrears.monthsBehind} months behind on the estate levy`
                : "This month's levy hasn't been paid yet"}
            </p>
            <p className="text-xs text-[#6B5D45] mt-0.5">
              Estimated balance: KES {Number(arrears.amountOwed).toLocaleString()} ({arrears.monthsBehind} × KES {Number(arrears.monthlyLevy).toLocaleString()}) — tap to pay via M-PESA.
            </p>
          </button>
        )}

        {/* Harambee / Fundraising campaigns — "Harambee" branding kept intentionally */}
        {(campaigns?.length ?? 0) > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Heart className="h-4 w-4 text-[#D4A017]" />
              <p className="section-label">Harambee Campaigns</p>
            </div>
            <div className="card-grid">
              {campaigns!.map((c) => {
                const current = Number(c.currentAmount);
                const goal = Number(c.goalAmount);
                const pct = Math.min(100, Math.round((current / goal) * 100));
                return (
                  <Card key={c.id} className="overflow-hidden">
                    <div className="h-1.5 w-full bg-[#D4C9A8]">
                      <div
                        className="h-full bg-[#D4A017] transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <CardContent className="py-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-[#212121] truncate">{c.title}</p>
                          {c.deadline && (
                            <p className="text-xs text-[#6B5D45] mt-0.5">Deadline: {formatDate(c.deadline)}</p>
                          )}
                        </div>
                        <Badge variant={c.status === "active" ? "success" : "default"}>
                          {c.status === "active" ? "Active" : c.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#6B5D45]">
                          <span className="font-bold text-[#212121]">KES {current.toLocaleString()}</span>
                          {" "}/ {goal.toLocaleString()}
                        </span>
                        <span className="font-bold text-[#D4A017]">{pct}%</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Pay button (residents only) */}
        {!isAdmin && (
          <button
            onClick={() => setPayOpen(true)}
            className="w-full bg-[#1B5E20] hover:bg-[#0D3B11] text-white rounded-2xl py-4 flex items-center justify-center gap-3 shadow-md transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="font-bold text-base">Pay Monthly Levy</p>
              <p className="text-xs text-white/70">Via M-PESA</p>
            </div>
          </button>
        )}

        {/* Payment history */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-[#6B5D45]" />
            <p className="section-label">{isAdmin ? "Estate Payments" : "Payment History"}</p>
          </div>
          {isLoading ? (
            <SectionLoader />
          ) : !myPayments?.length ? (
            <div className="tribal-card p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#1B5E20]/10 flex items-center justify-center mx-auto mb-3">
                <CreditCard className="h-7 w-7 text-[#1B5E20]" />
              </div>
              <p className="font-semibold text-[#212121] mb-1">No payments yet</p>
              <p className="text-[#6B5D45] text-sm">Your payment history will appear here</p>
            </div>
          ) : (
            <div className="card-grid">
              {myPayments.map((p) => {
                const card = (
                <Card key={p.id} className={p.status === "completed" ? "hover:shadow-card-lg transition-shadow" : ""}>
                  <CardContent className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#EDE7D8] flex items-center justify-center shrink-0">
                        {STATUS_ICON[p.status as keyof typeof STATUS_ICON] ?? <Clock className="h-4 w-4 text-[#6B5D45]" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#212121] truncate capitalize">
                          {p.description ?? p.type}
                        </p>
                        <p className="text-xs text-[#6B5D45]">{formatDateTime(p.createdAt)}</p>
                        {p.mpesaRef && <p className="text-xs text-[#D4C9A8]">Ref: {p.mpesaRef}</p>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm text-[#212121]">
                        KES {Number(p.amount).toLocaleString()}
                      </p>
                      <Badge variant={STATUS_VARIANT[p.status] ?? "default"} className="text-xs">
                        {STATUS_LABEL[p.status] ?? p.status}
                      </Badge>
                      {p.status === "completed" && (
                        <p className="text-[11px] text-[#1B5E20] font-semibold mt-0.5">Receipt →</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
                );
                return p.status === "completed"
                  ? <Link key={p.id} href={`/receipt/${p.id}`}>{card}</Link>
                  : card;
              })}
            </div>
          )}
        </section>
      </main>

      {payOpen && <PayDialog onClose={() => setPayOpen(false)} />}
      <BottomNav />
    </div>
  );
}
