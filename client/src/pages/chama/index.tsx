import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Coins } from "lucide-react";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { Chama, ChamaContribution } from "@shared/types";

const fmt = (x: string | number) => Number(x).toLocaleString("en-KE");
const currentPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function ChamaPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    contributionAmount: "",
    frequency: "monthly" as "weekly" | "monthly",
  });
  const [contributeOpen, setContributeOpen] = useState<string | null>(null);
  const [historyOpenId, setHistoryOpenId] = useState<string | null>(null);
  const [contribAmount, setContribAmount] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [contributeError, setContributeError] = useState<string | null>(null);

  const { data: chamas, isLoading } = useQuery<Chama[]>({
    queryKey: ["chama"],
    queryFn: () => api.get<Chama[]>("/api/chama").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof createForm) =>
      api.post("/api/chama", {
        name: body.name,
        description: body.description || undefined,
        contributionAmount: Math.trunc(Number(body.contributionAmount)),
        frequency: body.frequency,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chama"] });
      setShowCreate(false);
      setCreateError(null);
      setCreateForm({ name: "", description: "", contributionAmount: "", frequency: "monthly" });
    },
    onError: (err) => {
      setCreateError(err instanceof ApiError ? err.message : "Failed to create chama. Please try again.");
    },
  });

  const joinMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/chama/${id}/join`),
    onSuccess: () => {
      setJoinError(null);
      qc.invalidateQueries({ queryKey: ["chama"] });
    },
    onError: (err) => {
      setJoinError(err instanceof ApiError ? err.message : "Failed to join chama. Please try again.");
    },
  });

  const contributeMutation = useMutation({
    mutationFn: ({ id, amount, periodLabel }: { id: string; amount: string; periodLabel: string }) =>
      api.post(`/api/chama/${id}/contribute`, { amount: Math.trunc(Number(amount)), periodLabel }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["chama"] });
      qc.invalidateQueries({ queryKey: ["chama", vars.id, "contributions"] });
      setContributeOpen(null);
      setContribAmount("");
      setContributeError(null);
    },
    onError: (err) => {
      setContributeError(err instanceof ApiError ? err.message : "Failed to submit contribution. Please try again.");
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.contributionAmount) return;
    createMutation.mutate(createForm);
  };

  const handleContribute = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!contribAmount) return;
    contributeMutation.mutate({ id, amount: contribAmount, periodLabel: currentPeriod() });
  };

  const statusColor = (status: Chama["status"]) => {
    if (status === "active") return "bg-green-100 text-green-800";
    if (status === "paused") return "bg-amber-100 text-amber-800";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <div className="page-wrap">
      <TopBar title="Chama" />
      <main className="max-w-lg mx-auto px-4 pt-5 pb-6 space-y-5 page-content">
        {/* Create button */}
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="w-full py-2.5 rounded-xl font-semibold text-white text-sm"
          style={{ background: "#1B5E20" }}
        >
          {showCreate ? "Cancel" : "+ Start a Chama"}
        </button>

        {/* Inline create form */}
        {showCreate && (
          <form onSubmit={handleCreate} className="tribal-card p-4 space-y-3">
            <h3 className="font-bold text-base" style={{ color: "#6B5D45" }}>
              New Chama
            </h3>
            <input
              required
              placeholder="Chama name *"
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-[#D4A017]/40 rounded-lg px-3 py-2 text-sm bg-white"
            />
            {createForm.name.length > 0 && createForm.name.trim().length < 2 && (
              <p className="text-xs text-[#B71C1C]">At least 2 characters</p>
            )}
            <input
              placeholder="Description (optional)"
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full border border-[#D4A017]/40 rounded-lg px-3 py-2 text-sm bg-white"
            />
            <input
              required
              type="number"
              min="1"
              placeholder="Contribution amount (KES) *"
              value={createForm.contributionAmount}
              onChange={(e) => setCreateForm((f) => ({ ...f, contributionAmount: e.target.value }))}
              className="w-full border border-[#D4A017]/40 rounded-lg px-3 py-2 text-sm bg-white"
            />
            <select
              value={createForm.frequency}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, frequency: e.target.value as "weekly" | "monthly" }))
              }
              className="w-full border border-[#D4A017]/40 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
            </select>
            {createError && (
              <p className="text-xs text-[#B71C1C] font-medium">{createError}</p>
            )}
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full py-2 rounded-lg font-semibold text-white text-sm"
              style={{ background: "#1B5E20" }}
            >
              {createMutation.isPending ? "Creating…" : "Create Chama"}
            </button>
          </form>
        )}
        {joinError && (
          <p className="text-xs text-[#B71C1C] font-medium text-center">{joinError}</p>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="tribal-card p-4 animate-pulse space-y-2">
                <div className="h-4 bg-[#D4A017]/20 rounded w-2/3" />
                <div className="h-3 bg-[#D4A017]/10 rounded w-full" />
                <div className="h-3 bg-[#D4A017]/10 rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && chamas?.length === 0 && (
          <div className="tribal-card p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#D4A017]/10 flex items-center justify-center mx-auto mb-3">
              <Coins className="h-7 w-7 text-[#D4A017]" />
            </div>
            <p className="font-semibold text-[#212121] mb-1">No chamas yet</p>
            <p className="text-[#6B5D45] text-sm">Start one to begin saving together with your neighbours.</p>
          </div>
        )}

        {/* Chama cards */}
        {!isLoading && chamas && chamas.length > 0 && (
          <div className="space-y-4">
            {chamas.map((chama) => (
              <div key={chama.id} className="tribal-card p-4 space-y-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base truncate" style={{ color: "#6B5D45" }}>
                        {chama.name}
                      </h3>
                      {chama.adminId === user?.id && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: "#D4A017", color: "#fff" }}
                        >
                          Admin
                        </span>
                      )}
                    </div>
                    {chama.description && (
                      <p className="text-xs text-[#6B5D45]/70 mt-0.5">{chama.description}</p>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize whitespace-nowrap ${statusColor(chama.status)}`}
                  >
                    {chama.status}
                  </span>
                </div>

                {/* Details row */}
                <div className="flex items-center gap-4 text-sm text-[#6B5D45] flex-wrap">
                  <span className="font-semibold" style={{ color: "#1B5E20" }}>
                    KES {fmt(chama.contributionAmount)} / {chama.frequency === "monthly" ? "month" : "week"}
                  </span>
                  <span className="text-[#6B5D45]/60">·</span>
                  <span className="text-xs">{chama.memberCount ?? 0} members</span>
                  <span className="text-[#6B5D45]/60">·</span>
                  <span className="text-xs font-semibold" style={{ color: "#D4A017" }}>
                    KES {fmt(chama.totalContributed ?? 0)} saved
                  </span>
                </div>

                {chama.myMembership && (
                  <button
                    type="button"
                    onClick={() => setHistoryOpenId((v) => (v === chama.id ? null : chama.id))}
                    className="text-xs font-semibold underline"
                    style={{ color: "#1B5E20" }}
                  >
                    {historyOpenId === chama.id ? "Hide contributions" : "View contributions"}
                  </button>
                )}
                {historyOpenId === chama.id && <ContributionHistory chamaId={chama.id} />}

                {/* Action area */}
                {chama.myMembership === null || chama.myMembership === undefined ? (
                  <button
                    onClick={() => joinMutation.mutate(chama.id)}
                    disabled={joinMutation.isPending}
                    className="w-full py-2 rounded-lg text-sm font-semibold border-2"
                    style={{ borderColor: "#1B5E20", color: "#1B5E20" }}
                  >
                    {joinMutation.isPending ? "Joining…" : "Join Chama"}
                  </button>
                ) : (
                  <>
                    {contributeOpen !== chama.id ? (
                      <button
                        onClick={() => {
                          setContributeOpen(chama.id);
                          setContribAmount(chama.contributionAmount);
                        }}
                        className="w-full py-2 rounded-lg text-sm font-semibold text-white"
                        style={{ background: "#1B5E20" }}
                      >
                        Contribute
                      </button>
                    ) : (
                      <form
                        onSubmit={(e) => handleContribute(e, chama.id)}
                        className="space-y-2"
                      >
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            required
                            value={contribAmount}
                            onChange={(e) => setContribAmount(e.target.value)}
                            className="flex-1 border border-[#D4A017]/40 rounded-lg px-3 py-2 text-sm bg-white"
                            placeholder="Amount (KES)"
                          />
                          <span className="self-center text-xs text-[#6B5D45]/60">
                            {currentPeriod()}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={contributeMutation.isPending}
                            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
                            style={{ background: "#1B5E20" }}
                          >
                            {contributeMutation.isPending ? "Sending…" : "Pay"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setContributeOpen(null)}
                            className="px-4 py-2 rounded-lg text-sm border border-[#6B5D45]/30 text-[#6B5D45]"
                          >
                            Cancel
                          </button>
                        </div>
                        {contributeOpen === chama.id && contributeError && (
                          <p className="text-xs text-[#B71C1C] font-medium">{contributeError}</p>
                        )}
                      </form>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

function ContributionHistory({ chamaId }: { chamaId: string }) {
  const { data, isLoading } = useQuery<ChamaContribution[]>({
    queryKey: ["chama", chamaId, "contributions"],
    queryFn: () => api.get<ChamaContribution[]>(`/api/chama/${chamaId}/contributions`).then((r) => r.data),
  });

  if (isLoading) {
    return <p className="text-xs text-[#6B5D45]/60">Loading…</p>;
  }
  if (!data?.length) {
    return <p className="text-xs text-[#6B5D45]/60">No contributions recorded yet.</p>;
  }

  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-lg bg-[#D4A017]/5 p-2.5">
      {data.map((c) => (
        <div key={c.id} className="flex items-center justify-between text-xs">
          <span className="text-[#212121]">
            {c.user?.name ?? "Unknown"}
            {c.user?.unitNumber && <span className="text-[#6B5D45]/60"> · {c.user.unitNumber}</span>}
          </span>
          <span className="font-semibold" style={{ color: "#1B5E20" }}>
            KES {fmt(c.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}
