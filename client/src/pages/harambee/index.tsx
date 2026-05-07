import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { FundraisingCampaign } from "@shared/types";

const fmt = (x: string | number) => Number(x).toLocaleString("en-KE");
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
const isPast = (d: string) => new Date(d) < new Date();

function ProgressBar({ current, goal }: { current: string; goal: string }) {
  const pct = Math.min(100, (Number(current) / Number(goal)) * 100);
  return (
    <div className="w-full bg-[#E8E0D0] rounded-full h-2 mt-2">
      <div
        className="h-2 rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? "#D4A017" : "#1B5E20" }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: FundraisingCampaign["status"] }) {
  const map = {
    active: "bg-green-100 text-[#1B5E20] border-green-300",
    completed: "bg-yellow-100 text-[#D4A017] border-yellow-300",
    cancelled: "bg-red-100 text-red-700 border-red-300",
  };
  return (
    <Badge className={`text-xs border ${map[status]} capitalize`}>{status}</Badge>
  );
}

export default function HarambeePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === "admin";

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", description: "", goalAmount: "", deadline: "" });

  const [donateId, setDonateId] = useState<string | null>(null);
  const [donateForm, setDonateForm] = useState({ amount: "", anonymous: false });

  const { data: campaigns, isLoading } = useQuery<FundraisingCampaign[]>({
    queryKey: ["harambee"],
    queryFn: () => api.get<{ data: FundraisingCampaign[] }>("/api/harambee").then((r) => r.data.data),
  });

  const createMut = useMutation({
    mutationFn: (body: typeof createForm) =>
      api.post("/api/harambee", { ...body, goalAmount: Number(body.goalAmount) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["harambee"] });
      setShowCreate(false);
      setCreateForm({ title: "", description: "", goalAmount: "", deadline: "" });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/harambee/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["harambee"] }),
  });

  const donateMut = useMutation({
    mutationFn: ({ id, amount, anonymous }: { id: string; amount: number; anonymous: boolean }) =>
      api.post(`/api/harambee/${id}/donate`, { amount, anonymous }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["harambee"] });
      setDonateId(null);
      setDonateForm({ amount: "", anonymous: false });
    },
  });

  const inputCls = "w-full border border-[#C4B89A] rounded-lg px-3 py-2 text-sm bg-white text-[#6B5D45] focus:outline-none focus:ring-2 focus:ring-[#1B5E20]";
  const btnPrimary = "bg-[#1B5E20] hover:bg-[#145218] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors";
  const btnGold = "bg-[#D4A017] hover:bg-[#b88910] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors";
  const btnGhost = "border border-[#C4B89A] text-[#6B5D45] text-sm px-3 py-1.5 rounded-lg hover:bg-[#EDE8DC] transition-colors";

  return (
    <div className="page-wrap">
      <TopBar title="Harambee" />
      <main className="max-w-lg mx-auto px-4 pt-5 pb-6 space-y-5 page-content">

        {/* Admin: Create Campaign */}
        {isAdmin && (
          <div>
            {!showCreate ? (
              <button className={btnPrimary} onClick={() => setShowCreate(true)}>
                + New Campaign
              </button>
            ) : (
              <div className="tribal-card p-4 space-y-3">
                <h3 className="font-semibold text-[#1B5E20]">Create Campaign</h3>
                <input className={inputCls} placeholder="Title *" value={createForm.title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} />
                <textarea className={inputCls} placeholder="Description" rows={2} value={createForm.description}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} />
                <input className={inputCls} type="number" placeholder="Goal Amount (KES) *" value={createForm.goalAmount}
                  onChange={(e) => setCreateForm((f) => ({ ...f, goalAmount: e.target.value }))} />
                <input className={inputCls} type="date" placeholder="Deadline" value={createForm.deadline}
                  onChange={(e) => setCreateForm((f) => ({ ...f, deadline: e.target.value }))} />
                <div className="flex gap-2">
                  <button className={btnPrimary} disabled={!createForm.title || !createForm.goalAmount || createMut.isPending}
                    onClick={() => createMut.mutate(createForm)}>
                    {createMut.isPending ? "Saving…" : "Create"}
                  </button>
                  <button className={btnGhost} onClick={() => setShowCreate(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="tribal-card p-4 space-y-3 animate-pulse">
                <div className="h-4 bg-[#E8E0D0] rounded w-3/4" />
                <div className="h-3 bg-[#E8E0D0] rounded w-full" />
                <div className="h-2 bg-[#E8E0D0] rounded-full w-full" />
                <div className="h-3 bg-[#E8E0D0] rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && campaigns?.length === 0 && (
          <div className="text-center py-12 text-[#6B5D45]">
            <p className="text-4xl mb-3">🤝</p>
            <p className="font-medium">No fundraising campaigns yet</p>
            <p className="text-sm mt-1 text-[#8C7B65]">Check back soon or ask your admin to create one.</p>
          </div>
        )}

        {/* Campaign cards */}
        {campaigns?.map((c) => {
          const pct = Math.min(100, (Number(c.currentAmount) / Number(c.goalAmount)) * 100);
          const deadlinePast = c.deadline ? isPast(c.deadline) : false;
          const isDonating = donateId === c.id;

          return (
            <div key={c.id} className="tribal-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#1B5E20] leading-tight">{c.title}</h3>
                  {c.description && <p className="text-sm text-[#6B5D45] mt-0.5 line-clamp-2">{c.description}</p>}
                </div>
                <StatusBadge status={c.status} />
              </div>

              <div>
                <ProgressBar current={c.currentAmount} goal={c.goalAmount} />
                <p className="text-xs text-[#6B5D45] mt-1">
                  KES {fmt(c.currentAmount)} raised of KES {fmt(c.goalAmount)} goal
                  <span className="ml-1 font-medium text-[#1B5E20]">({pct.toFixed(0)}%)</span>
                </p>
              </div>

              {c.deadline && (
                <p className="text-xs text-[#8C7B65]">
                  {deadlinePast ? "Ended" : "Ends"} {fmtDate(c.deadline)}
                </p>
              )}

              {/* Donate section (residents, active campaigns) */}
              {!isAdmin && c.status === "active" && (
                <div>
                  {!isDonating ? (
                    <button className={btnGold} onClick={() => setDonateId(c.id)}>Donate</button>
                  ) : (
                    <div className="border border-[#D4A017] rounded-lg p-3 space-y-2 bg-yellow-50">
                      <input className={inputCls} type="number" placeholder="Amount (KES)" value={donateForm.amount}
                        onChange={(e) => setDonateForm((f) => ({ ...f, amount: e.target.value }))} />
                      <label className="flex items-center gap-2 text-sm text-[#6B5D45] cursor-pointer">
                        <input type="checkbox" checked={donateForm.anonymous}
                          onChange={(e) => setDonateForm((f) => ({ ...f, anonymous: e.target.checked }))} />
                        Donate anonymously
                      </label>
                      <div className="flex gap-2">
                        <button className={btnGold} disabled={!donateForm.amount || donateMut.isPending}
                          onClick={() => donateMut.mutate({ id: c.id, amount: Number(donateForm.amount), anonymous: donateForm.anonymous })}>
                          {donateMut.isPending ? "Sending…" : "Confirm"}
                        </button>
                        <button className={btnGhost} onClick={() => { setDonateId(null); setDonateForm({ amount: "", anonymous: false }); }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Admin controls */}
              {isAdmin && c.status === "active" && (
                <div className="flex gap-2 pt-1">
                  <button className={btnPrimary} disabled={updateMut.isPending}
                    onClick={() => updateMut.mutate({ id: c.id, status: "completed" })}>
                    Mark Complete
                  </button>
                  <button className="border border-red-300 text-red-600 text-sm px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    disabled={updateMut.isPending}
                    onClick={() => updateMut.mutate({ id: c.id, status: "cancelled" })}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </main>
      <BottomNav />
    </div>
  );
}
