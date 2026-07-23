import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CreditCard, CheckCircle2, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Payment } from "@shared/types";

interface LevyArrears { monthlyLevy: number | null; monthsBehind: number; amountOwed: number | null }

// Mirrors the "levy status this month" definition already used by the admin
// analytics dashboard (server/src/routes/analytics.ts) — a completed levy
// payment dated on/after the 1st of the current calendar month counts as
// "paid" for that month. No separate billing-cycle/amount-owed record
// exists in the schema today, so this widget reflects that same real
// signal rather than inventing a due-amount figure nothing backs.
export function LevyStatusWidget() {
  const { data: payments, isLoading, isError } = useQuery<Payment[]>({
    queryKey: ["payments"],
    queryFn: () => api.get<Payment[]>("/api/payments/my").then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });
  const { data: arrears } = useQuery({
    queryKey: ["levy-arrears"],
    queryFn: () => api.get<LevyArrears | null>("/api/payments/levy-arrears").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="tribal-card p-4 animate-pulse">
        <div className="h-4 bg-[#D4C9A8] rounded w-1/3 mb-2" />
        <div className="h-8 bg-[#D4C9A8] rounded w-2/3" />
      </div>
    );
  }

  if (isError || !payments) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = endOfMonth.getDate();
  const pctThroughMonth = Math.min(100, Math.round((now.getDate() / daysInMonth) * 100));

  const levyPayments = payments
    .filter((p) => p.type === "levy" && p.status === "completed")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const lastPayment = levyPayments[0];
  const paidThisMonth = levyPayments.find((p) => new Date(p.createdAt) >= startOfMonth);

  const monthName = now.toLocaleDateString("en-KE", { month: "long" });

  return (
    <Link href="/payments">
      <div className="tribal-card p-4 hover:shadow-card-lg transition-shadow cursor-pointer">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <CreditCard className="h-4 w-4 text-[#1B5E20]" />
            <span className="section-label text-[#1B5E20]">Levy Status</span>
          </div>
          {paidThisMonth ? (
            <span className="flex items-center gap-1 text-xs font-bold text-[#1B5E20]">
              <CheckCircle2 className="h-3.5 w-3.5" /> Paid
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-bold text-[#D47A00]">
              <AlertTriangle className="h-3.5 w-3.5" /> Due
            </span>
          )}
        </div>

        {paidThisMonth ? (
          <>
            <p className="text-sm text-[#212121] font-semibold">
              {monthName} levy paid — KES {Number(paidThisMonth.amount).toLocaleString()}
            </p>
            <p className="text-xs text-[#6B5D45] mt-0.5">
              on {formatDate(paidThisMonth.createdAt)}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-[#212121] font-semibold">
              No levy payment recorded for {monthName} yet
            </p>
            <p className="text-xs text-[#6B5D45] mt-0.5">
              {lastPayment
                ? `Last paid ${formatDate(lastPayment.createdAt)} · KES ${Number(lastPayment.amount).toLocaleString()}`
                : "Due by the end of the month"}
            </p>
          </>
        )}

        {arrears && arrears.monthlyLevy != null && arrears.monthsBehind >= 2 && (
          <p className="text-xs font-semibold text-[#B71C1C] mt-1.5">
            ⚠ {arrears.monthsBehind} months outstanding — est. KES {Number(arrears.amountOwed).toLocaleString()}
          </p>
        )}

        <div className="mt-2.5 h-1.5 w-full bg-[#EDE7D8] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              paidThisMonth ? "bg-[#1B5E20]" : pctThroughMonth > 70 ? "bg-[#B71C1C]" : "bg-[#D47A00]"
            }`}
            style={{ width: `${paidThisMonth ? 100 : pctThroughMonth}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
