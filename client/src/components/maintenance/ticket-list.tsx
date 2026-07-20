import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Wrench, AlertCircle, Clock, CheckCircle, ChevronDown, ChevronUp, Send } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TicketForm } from "./ticket-form";
import { TicketStatusStepper } from "./ticket-status-stepper";
import { SectionLoader } from "@/components/shared/loading";
import { formatRelative } from "@/lib/utils";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import type { MaintenanceTicket, TicketStatus, TicketPriority } from "@shared/types";

const STATUS_MAP: Record<TicketStatus, { label: string; variant: string; icon: React.ReactNode; bar: string }> = {
  open:        { label: "Open",        variant: "warning",   icon: <AlertCircle className="h-3 w-3" />, bar: "bg-amber-500" },
  assigned:    { label: "Assigned",    variant: "info",      icon: <Clock className="h-3 w-3" />,       bar: "bg-blue-500" },
  in_progress: { label: "In Progress", variant: "default",   icon: <Clock className="h-3 w-3" />,       bar: "bg-[#1B5E20]" },
  resolved:    { label: "Resolved",    variant: "success",   icon: <CheckCircle className="h-3 w-3" />, bar: "bg-[#1B5E20]" },
  closed:      { label: "Closed",      variant: "secondary", icon: <CheckCircle className="h-3 w-3" />, bar: "bg-[#D4C9A8]" },
};

const PRIORITY_MAP: Record<TicketPriority, { label: string; variant: string; color: string }> = {
  low:    { label: "Low",    variant: "secondary", color: "text-[#6B5D45]" },
  medium: { label: "Medium", variant: "info",      color: "text-amber-700" },
  high:   { label: "High",   variant: "warning",   color: "text-[#D47A00]" },
  urgent: { label: "Urgent", variant: "urgent",    color: "text-[#B71C1C]" },
};

const CATEGORY_EMOJI: Record<string, string> = {
  plumbing: "🔧", electrical: "⚡", roads: "🛣️",
  landscaping: "🌿", security: "🔒", cleaning: "🧹", other: "📋",
};

interface TicketCardProps {
  ticket: MaintenanceTicket;
}

function TicketCard({ ticket }: TicketCardProps) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);

  const cfg = STATUS_MAP[ticket.status];
  const pri = PRIORITY_MAP[ticket.priority];
  const emoji = CATEGORY_EMOJI[ticket.category] ?? "📋";

  const commentMutation = useMutation({
    mutationFn: () =>
      api.post(`/api/maintenance/${ticket.id}/comments`, { body: commentBody }),
    onSuccess: () => {
      setCommentBody("");
      setCommentError(null);
      qc.invalidateQueries({ queryKey: ["maintenance", "my"] });
    },
    onError: (err) => {
      setCommentError(err instanceof ApiError ? err.message : "Failed to post comment. Please try again.");
    },
  });

  return (
    <Card className="overflow-hidden">
      <div className={`h-1 w-full ${cfg.bar}`} />
      <CardContent className="py-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#EDE7D8] flex items-center justify-center shrink-0 text-lg">
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-[#212121] truncate">{ticket.title}</p>
            <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
              <Badge variant={cfg.variant as never} className="flex items-center gap-1 text-xs">
                {cfg.icon} {cfg.label}
              </Badge>
              <span className={`text-xs font-medium ${pri.color}`}>{pri.label}</span>
            </div>
            {ticket.photoUrls && ticket.photoUrls.length > 0 && (
              <div className="mt-2 flex gap-1">
                {ticket.photoUrls.slice(0, 3).map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Photo ${i + 1}`}
                    className="w-14 h-14 object-cover rounded-lg border border-tribal-border"
                  />
                ))}
                {ticket.photoUrls.length > 3 && (
                  <div className="w-14 h-14 rounded-lg bg-[#EDE7D8] flex items-center justify-center text-xs font-semibold text-[#6B5D45]">
                    +{ticket.photoUrls.length - 3}
                  </div>
                )}
              </div>
            )}
            {ticket.adminNotes && (
              <div className="mt-1.5 pl-2 border-l-2 border-[#1B5E20]/40">
                <p className="text-xs text-[#1B5E20] font-medium">Admin Notes:</p>
                <p className="text-xs text-[#1B5E20]/80">{ticket.adminNotes}</p>
              </div>
            )}
            <p className="text-xs text-[#D4C9A8] mt-1.5">{formatRelative(ticket.createdAt)}</p>
          </div>
          {ticket.comments && ticket.comments.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
              className="shrink-0 h-8 w-8 p-0"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-tribal-border">
          <TicketStatusStepper status={ticket.status} />
        </div>

        {expanded && ticket.comments && ticket.comments.length > 0 && (
          <div className="mt-3 space-y-2 pt-3 border-t border-tribal-border">
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {ticket.comments.map((c) => (
                <div key={c.id} className="rounded-lg bg-tribal-background p-2 text-xs">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-[#212121]">{c.author?.name ?? "Unknown"}</span>
                    <span className="text-[#D4C9A8]">{formatRelative(c.createdAt)}</span>
                  </div>
                  <p className="text-[#6B5D45] mt-0.5">{c.body}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-1.5 mt-2">
              <Input
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Reply..."
                className="text-xs h-8"
              />
              <Button
                size="sm"
                onClick={() => commentMutation.mutate()}
                disabled={!commentBody.trim() || commentMutation.isPending}
                className="shrink-0 h-8 w-8 p-0"
              >
                <Send className="h-3 w-3" />
              </Button>
            </div>
            {commentError && (
              <p className="text-xs text-[#B71C1C] font-medium">{commentError}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TicketList() {
  const [formOpen, setFormOpen] = useState(false);
  const { pendingCount, syncing } = useOfflineSync();

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["maintenance", "my"],
    queryFn: () => api.get<MaintenanceTicket[]>("/api/maintenance/my").then((r) => r.data),
  });

  if (isLoading) return <SectionLoader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="section-label">My Tickets</p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Report Issue
        </Button>
      </div>

      {pendingCount > 0 && (
        <div className="rounded-xl bg-[#D47A00]/10 border border-[#D47A00]/20 px-3 py-2.5 text-sm text-[#D47A00] flex items-center gap-2">
          <Send className="h-4 w-4 shrink-0" />
          {syncing
            ? "Syncing offline reports…"
            : `${pendingCount} report${pendingCount > 1 ? "s" : ""} saved offline — will submit automatically once you're back online.`}
        </div>
      )}

      {!tickets?.length ? (
        <div className="tribal-card p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#D47A00]/10 flex items-center justify-center mx-auto mb-3">
            <Wrench className="h-7 w-7 text-[#D47A00]" />
          </div>
          <p className="font-semibold text-[#212121] mb-1">No tickets yet</p>
          <p className="text-[#6B5D45] text-sm mb-4">Report any issue with the estate or facilities</p>
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(true)}>
            Report Issue
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {tickets.map((t) => (
            <TicketCard key={t.id} ticket={t} />
          ))}
        </div>
      )}

      <TicketForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
