import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Vote, Plus, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SectionLoader } from "@/components/shared/loading";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Poll } from "@shared/types";

function CreatePollDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [closesAt, setClosesAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.post("/api/polls", {
      title, description: description || undefined,
      options: options.filter(Boolean),
      closesAt: closesAt || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["polls"] }); onClose(); },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Failed to create poll. Please try again.");
    },
  });

  const addOption = () => setOptions((o) => [...o, ""]);
  const setOption = (i: number, v: string) => setOptions((o) => o.map((x, idx) => idx === i ? v : x));
  const removeOption = (i: number) => setOptions((o) => o.filter((_, idx) => idx !== i));

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-xl bg-[#1B5E20] flex items-center justify-center">
              <Vote className="h-5 w-5 text-white" />
            </div>
            <DialogTitle>Create Poll</DialogTitle>
          </div>
        </DialogHeader>
        <div className="px-6 pb-2 space-y-4">
          <div>
            <Label className="text-[#212121] font-semibold">Question</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What would you like to ask?"
              error={title.length > 0 && title.trim().length < 3 ? "At least 3 characters" : undefined}
            />
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Options</Label>
            <div className="space-y-2 mt-1">
              {options.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={o} onChange={(e) => setOption(i, e.target.value)} placeholder={`Option ${i + 1}`} />
                  {options.length > 2 && (
                    <Button size="sm" variant="ghost" onClick={() => removeOption(i)}>✕</Button>
                  )}
                </div>
              ))}
              {options.length < 10 && (
                <Button size="sm" variant="secondary" onClick={addOption}>+ Add option</Button>
              )}
            </div>
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Closing date (optional)</Label>
            <Input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
          </div>
          {error && (
            <p className="text-sm text-[#B71C1C] bg-[#B71C1C]/8 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={title.trim().length < 3 || options.filter(Boolean).length < 2}
          >
            Create Poll
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PollCard({ poll }: { poll: Poll }) {
  const qc = useQueryClient();
  const [voteError, setVoteError] = useState<string | null>(null);
  const isClosed = poll.closesAt ? new Date(poll.closesAt) < new Date() : false;

  const vote = useMutation({
    mutationFn: (optionId: string) => api.post(`/api/polls/${poll.id}/vote`, { optionId }),
    onSuccess: () => { setVoteError(null); qc.invalidateQueries({ queryKey: ["polls"] }); },
    onError: (err) => {
      setVoteError(err instanceof ApiError ? err.message : "Failed to submit your vote. Please try again.");
    },
  });

  const total = poll.totalVotes ?? 0;
  const hasVoted = !!poll.myVoteOptionId;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-bold text-[#212121]">{poll.title}</CardTitle>
          <div className="flex items-center gap-1 shrink-0">
            {isClosed && <Lock className="h-3.5 w-3.5 text-[#6B5D45]" />}
            <Badge variant={isClosed ? "secondary" : "success"}>
              {isClosed ? "Closed" : "Open"}
            </Badge>
          </div>
        </div>
        {poll.description && <p className="text-xs text-[#6B5D45]">{poll.description}</p>}
        {poll.closesAt && !isClosed && (
          <p className="text-xs text-amber-700 font-medium">Closes: {formatDate(poll.closesAt)}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {poll.options?.map((opt) => {
          const pct = total > 0 ? Math.round((opt.voteCount / total) * 100) : 0;
          const isMyVote = poll.myVoteOptionId === opt.id;
          return (
            <button
              key={opt.id}
              className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors relative overflow-hidden ${
                isMyVote
                  ? "border-[#1B5E20] bg-[#1B5E20]/6"
                  : "border-[#D4C9A8] hover:border-[#1B5E20]/40"
              } ${hasVoted || isClosed ? "cursor-default" : "cursor-pointer"}`}
              onClick={() => !hasVoted && !isClosed && vote.mutate(opt.id)}
              disabled={hasVoted || isClosed || vote.isPending}
            >
              {(hasVoted || isClosed) && (
                <div
                  className="absolute inset-y-0 left-0 bg-[#1B5E20]/8 rounded-xl"
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between">
                <span className="text-sm text-[#212121] font-medium">{opt.label}</span>
                {(hasVoted || isClosed) && (
                  <span className="text-xs text-[#6B5D45] font-semibold">{pct}% ({opt.voteCount})</span>
                )}
              </div>
            </button>
          );
        })}
        <p className="text-xs text-[#D4C9A8] text-right">
          {total} vote{total !== 1 ? "s" : ""} total
        </p>
        {voteError && (
          <p className="text-xs text-[#B71C1C] font-medium">{voteError}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function GovernancePage() {
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: polls, isLoading } = useQuery({
    queryKey: ["polls"],
    queryFn: () => api.get<Poll[]>("/api/polls").then((r) => r.data),
  });

  return (
    <div className="page-wrap">
      <TopBar title="Governance" />
      <main className="max-w-lg mx-auto px-4 pt-4 page-content">
        <div className="flex items-center justify-between mb-4">
          <p className="section-label">Estate Polls</p>
          {user?.role === "admin" && (
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> New Poll
            </Button>
          )}
        </div>

        {isLoading ? (
          <SectionLoader />
        ) : !polls?.length ? (
          <div className="tribal-card p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#1B5E20]/10 flex items-center justify-center mx-auto mb-3">
              <Vote className="h-7 w-7 text-[#1B5E20]" />
            </div>
            <p className="font-semibold text-[#212121] mb-1">No polls yet</p>
            <p className="text-[#6B5D45] text-sm">Estate polls will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {polls.map((p) => <PollCard key={p.id} poll={p} />)}
          </div>
        )}
      </main>

      {createOpen && <CreatePollDialog onClose={() => setCreateOpen(false)} />}
      <BottomNav />
    </div>
  );
}
