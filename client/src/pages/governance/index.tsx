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
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Poll } from "@shared/types";

function CreatePollDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [closesAt, setClosesAt] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.post("/api/polls", {
      title, description: description || undefined,
      options: options.filter(Boolean),
      closesAt: closesAt ? new Date(closesAt).toISOString() : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["polls"] }); onClose(); },
  });

  const addOption = () => setOptions((o) => [...o, ""]);
  const setOption = (i: number, v: string) => setOptions((o) => o.map((x, idx) => idx === i ? v : x));
  const removeOption = (i: number) => setOptions((o) => o.filter((_, idx) => idx !== i));

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Poll</DialogTitle></DialogHeader>
        <div className="px-6 pb-2 space-y-4">
          <div><Label>Question</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What do you want to ask?" /></div>
          <div><Label>Description (optional)</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div>
            <Label>Options</Label>
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
          <div><Label>Closes at (optional)</Label><Input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!title || options.filter(Boolean).length < 2}
          >Post Poll</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PollCard({ poll }: { poll: Poll }) {
  const qc = useQueryClient();
  const isClosed = poll.closesAt ? new Date(poll.closesAt) < new Date() : false;

  const vote = useMutation({
    mutationFn: (optionId: string) => api.post(`/api/polls/${poll.id}/vote`, { optionId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["polls"] }),
  });

  const total = poll.totalVotes ?? 0;
  const hasVoted = !!poll.myVoteOptionId;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-gray-900">{poll.title}</CardTitle>
          <div className="flex items-center gap-1 shrink-0">
            {isClosed && <Lock className="h-3.5 w-3.5 text-gray-400" />}
            <Badge variant={isClosed ? "default" : "success"}>{isClosed ? "Closed" : "Open"}</Badge>
          </div>
        </div>
        {poll.description && <p className="text-xs text-gray-500">{poll.description}</p>}
        {poll.closesAt && !isClosed && (
          <p className="text-xs text-amber-600">Closes {formatDate(poll.closesAt)}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {poll.options?.map((opt) => {
          const pct = total > 0 ? Math.round((opt.voteCount / total) * 100) : 0;
          const isMyVote = poll.myVoteOptionId === opt.id;
          return (
            <button
              key={opt.id}
              className={`w-full text-left rounded-lg border px-3 py-2 transition-colors relative overflow-hidden ${
                isMyVote ? "border-[#1A5C38] bg-[#1A5C38]/5" : "border-[#E8E6E3] hover:border-[#1A5C38]/40"
              } ${hasVoted || isClosed ? "cursor-default" : "cursor-pointer"}`}
              onClick={() => !hasVoted && !isClosed && vote.mutate(opt.id)}
              disabled={hasVoted || isClosed || vote.isPending}
            >
              {(hasVoted || isClosed) && (
                <div
                  className="absolute inset-y-0 left-0 bg-[#1A5C38]/8 rounded-lg"
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between">
                <span className="text-sm text-gray-800">{opt.label}</span>
                {(hasVoted || isClosed) && (
                  <span className="text-xs text-gray-500 font-medium">{pct}% ({opt.voteCount})</span>
                )}
              </div>
            </button>
          );
        })}
        <p className="text-xs text-gray-400 text-right">{total} vote{total !== 1 ? "s" : ""} total</p>
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
    <div className="min-h-screen bg-white pb-20">
      <TopBar title="Governance" />
      <main className="max-w-lg mx-auto px-4 pt-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-semibold text-gray-900">Polls & Voting</h1>
          {user?.role === "admin" && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Poll
            </Button>
          )}
        </div>

        {isLoading ? (
          <SectionLoader />
        ) : !polls?.length ? (
          <div className="text-center py-16">
            <Vote className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No polls yet.</p>
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
