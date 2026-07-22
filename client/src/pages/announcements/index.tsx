import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Megaphone, Volume2, MessageSquare, Check, Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { SectionLoader } from "@/components/shared/loading";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/utils";
import type { Announcement, AnnouncementReads } from "@shared/types";

const PRIORITY_CONFIG = {
  info:    { label: "Info",    variant: "default"     as const, left: "border-l-4 border-l-[#1B5E20]",  icon: "📢" },
  warning: { label: "Warning", variant: "warning"    as const, left: "border-l-4 border-l-amber-500",  icon: "⚠️" },
  urgent:  { label: "Urgent",  variant: "destructive" as const, left: "border-l-4 border-l-[#B71C1C]",  icon: "🚨" },
};

function ComposeModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("info");

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/api/announcements", { title, body, priority }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-xl bg-[#1B5E20] flex items-center justify-center">
              <Volume2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle>Post Announcement</DialogTitle>
              <p className="text-xs text-[#6B5D45] mt-0.5">All residents will receive this announcement</p>
            </div>
          </div>
        </DialogHeader>
        <div className="px-6 pb-2 space-y-4">
          <div>
            <Label className="text-[#212121] font-semibold">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement subject"
            />
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your announcement here..."
              rows={4}
            />
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">📢 Info</SelectItem>
                <SelectItem value="warning">⚠️ Warning</SelectItem>
                <SelectItem value="urgent">🚨 Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!title || !body}
          >
            Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Admin-only, lazy-loaded on demand — who has actually seen this notice.
function ReadReceipts({ announcementId }: { announcementId: string }) {
  const { data, isLoading } = useQuery<AnnouncementReads>({
    queryKey: ["announcements", announcementId, "reads"],
    queryFn: () => api.get<AnnouncementReads>(`/api/announcements/${announcementId}/reads`).then((r) => r.data),
  });

  if (isLoading) return <p className="text-xs text-[#6B5D45]/60">Loading…</p>;
  if (!data) return null;
  if (data.readers.length === 0) {
    return <p className="text-xs text-[#6B5D45]/60">No one has acknowledged this yet.</p>;
  }

  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-lg bg-[#1B5E20]/5 p-2.5">
      {data.readers.map((r, i) => (
        <div key={i} className="flex items-center justify-between text-xs">
          <span className="text-[#212121]">
            {r.name}
            {r.unitNumber && <span className="text-[#6B5D45]/60"> · {r.unitNumber}</span>}
          </span>
          <span className="text-[#6B5D45]/60">{formatRelative(r.readAt)}</span>
        </div>
      ))}
    </div>
  );
}

function AcknowledgeButton({ announcement }: { announcement: Announcement }) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => api.post(`/api/announcements/${announcement.id}/acknowledge`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });

  if (announcement.myAcknowledged) {
    return (
      <span className="flex items-center gap-1 text-xs text-[#1B5E20] font-medium">
        <Check className="h-3 w-3" /> You've seen this
      </span>
    );
  }

  return (
    <button
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className="flex items-center gap-1 text-xs text-[#1B5E20] font-semibold hover:underline disabled:opacity-60"
    >
      <Check className="h-3 w-3" /> Mark as seen
    </button>
  );
}

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [composeOpen, setComposeOpen] = useState(false);
  const [expandedReads, setExpandedReads] = useState<string | null>(null);

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: () =>
      api.get<Announcement[]>("/api/announcements").then((r) => r.data),
  });

  return (
    <div className="page-wrap" data-bottomnav="true">
      <TopBar title="Announcements" />
      <main className="container-list pt-4 page-content">
        <div className="flex items-center justify-between mb-4">
          <p className="section-label">Estate Announcements</p>
          {user?.role === "admin" && (
            <Button size="sm" onClick={() => setComposeOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Post
            </Button>
          )}
        </div>

        {isLoading ? (
          <SectionLoader />
        ) : !announcements?.length ? (
          <div className="tribal-card p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#1B5E20]/10 flex items-center justify-center mx-auto mb-3">
              <Megaphone className="h-7 w-7 text-[#1B5E20]" />
            </div>
            <p className="font-semibold text-[#212121] mb-1">No announcements yet</p>
            <p className="text-[#6B5D45] text-sm">Estate announcements will appear here</p>
          </div>
        ) : (
          <div className="card-grid">
            {announcements.map((a) => {
              const cfg = PRIORITY_CONFIG[a.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.info;
              return (
                <Card key={a.id} className={cfg.left}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <span className="text-xl shrink-0 mt-0.5">{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-sm text-[#212121]">{a.title}</p>
                          <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                        </div>
                        <p className="text-sm text-[#6B5D45] leading-relaxed">{a.body}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <p className="text-xs text-[#D4C9A8]">{formatRelative(a.createdAt)}</p>
                          {a.priority === "urgent" && a.smsSent && (
                            <span className="flex items-center gap-1 text-xs text-[#1B5E20] font-medium">
                              <MessageSquare className="h-3 w-3" /> SMS sent to residents
                            </span>
                          )}
                          {user?.role === "admin" ? (
                            <button
                              onClick={() => setExpandedReads(expandedReads === a.id ? null : a.id)}
                              className="flex items-center gap-1 text-xs text-[#1B5E20] font-semibold hover:underline"
                            >
                              <Eye className="h-3 w-3" />
                              {expandedReads === a.id ? "Hide" : "Who's seen this?"}
                            </button>
                          ) : (
                            <AcknowledgeButton announcement={a} />
                          )}
                        </div>
                        {user?.role === "admin" && expandedReads === a.id && (
                          <div className="mt-2">
                            <ReadReceipts announcementId={a.id} />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {composeOpen && <ComposeModal onClose={() => setComposeOpen(false)} />}
      <BottomNav />
    </div>
  );
}
