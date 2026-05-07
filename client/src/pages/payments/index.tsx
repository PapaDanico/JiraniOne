import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, CheckCircle, Clock, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SectionLoader } from "@/components/shared/loading";
import { api } from "@/lib/api";
import { formatDateTime, formatDate } from "@/lib/utils";
import type { Payment, FundraisingCampaign } from "@shared/types";

const statusIcon = {
  completed: <CheckCircle className="h-4 w-4 text-green-500" />,
  pending: <Clock className="h-4 w-4 text-amber-500" />,
  failed: <XCircle className="h-4 w-4 text-red-400" />,
};

const statusVariant: Record<string, "success" | "warning" | "destructive" | "default"> = {
  completed: "success",
  pending: "warning",
  failed: "destructive",
};

function PayDialog({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      api.post<{ message?: string; stub?: boolean }>("/api/payments/stk-push", {
        amount: Number(amount),
        type: "levy",
        description: "Monthly levy",
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      setMsg(res.data.message ?? (res.data.stub ? "Dev mode: payment recorded." : "Check your phone for M-PESA prompt."));
    },
  });

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pay Service Charge / Levy</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-2 space-y-4">
          <p className="text-sm text-gray-500">
            Payment will be sent to <strong>{user?.phone}</strong> via M-PESA.
          </p>
          <div>
            <Label>Amount (KES)</Label>
            <Input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 5000"
            />
          </div>
          {msg && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
              {msg}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {!msg && (
            <Button
              onClick={() => mutation.mutate()}
              loading={mutation.isPending}
              disabled={!amount || Number(amount) < 1}
            >
              Pay KES {amount || "—"}
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
    <div className="min-h-screen bg-white pb-20">
      <TopBar title="Payments" />
      <main className="max-w-lg mx-auto px-4 pt-4 space-y-6">

        {/* Fundraising campaigns */}
        {(campaigns?.length ?? 0) > 0 && (
          <section>
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">Active Campaigns</h2>
            <div className="space-y-3">
              {campaigns!.map((c) => {
                const pct = Math.min(100, Math.round((Number(c.currentAmount) / Number(c.goalAmount)) * 100));
                return (
                  <Card key={c.id}>
                    <CardContent className="py-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{c.title}</p>
                          {c.deadline && (
                            <p className="text-xs text-gray-400">Closes {formatDate(c.deadline)}</p>
                          )}
                        </div>
                        <Badge variant={c.status === "active" ? "success" : "default"}>{c.status}</Badge>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                        <div className="bg-[#1A5C38] h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-gray-500">
                        KES {Number(c.currentAmount).toLocaleString()} of KES {Number(c.goalAmount).toLocaleString()} ({pct}%)
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Pay button (residents) */}
        {!isAdmin && (
          <Button className="w-full" onClick={() => setPayOpen(true)}>
            <CreditCard className="h-4 w-4" /> Pay Service Charge
          </Button>
        )}

        {/* Payment history */}
        <section>
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">
            {isAdmin ? "Estate Payments" : "My Payments"}
          </h2>
          {isLoading ? (
            <SectionLoader />
          ) : !myPayments?.length ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No payments yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myPayments.map((p) => (
                <Card key={p.id}>
                  <CardContent className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {statusIcon[p.status as keyof typeof statusIcon] ?? <Clock className="h-4 w-4 text-gray-400" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate capitalize">
                          {p.description ?? p.type}
                        </p>
                        <p className="text-xs text-gray-400">{formatDateTime(p.createdAt)}</p>
                        {p.mpesaRef && <p className="text-xs text-gray-400">Ref: {p.mpesaRef}</p>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-sm text-gray-900">
                        KES {Number(p.amount).toLocaleString()}
                      </p>
                      <Badge variant={statusVariant[p.status] ?? "default"} className="text-xs">
                        {p.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>

      {payOpen && <PayDialog onClose={() => setPayOpen(false)} />}
      <BottomNav />
    </div>
  );
}
