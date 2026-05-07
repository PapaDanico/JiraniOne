import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Wrench } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SectionLoader } from "@/components/shared/loading";
import { formatRelative } from "@/lib/utils";
import type { MaintenanceTicket, TicketStatus, TicketPriority } from "@shared/types";

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
  low:    { label: "Low",    color: "text-[#6B5D45]" },
  medium: { label: "Medium", color: "text-amber-700" },
  high:   { label: "High",   color: "text-[#D47A00]" },
  urgent: { label: "Urgent", color: "text-[#B71C1C] font-bold" },
};

const CATEGORY_EMOJI: Record<string, string> = {
  plumbing: "🔧", electrical: "⚡", roads: "🛣️",
  landscaping: "🌿", security: "🔒", cleaning: "🧹", other: "📋",
};

const STATUSES: TicketStatus[] = ["open", "assigned", "in_progress", "resolved", "closed"];

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open", assigned: "Assigned", in_progress: "In Progress",
  resolved: "Resolved", closed: "Closed",
};

interface UpdateModalProps {
  ticket: MaintenanceTicket;
  onClose: () => void;
}

function UpdateModal({ ticket, onClose }: UpdateModalProps) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [notes, setNotes] = useState(ticket.adminNotes ?? "");

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/api/maintenance/${ticket.id}`, { status, adminNotes: notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance"] });
      onClose();
    },
  });

  const emoji = CATEGORY_EMOJI[ticket.category] ?? "📋";
  const pri = PRIORITY_CONFIG[ticket.priority];

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-xl bg-[#D47A00]/10 flex items-center justify-center text-xl">
              {emoji}
            </div>
            <div>
              <DialogTitle>Update Ticket</DialogTitle>
              <p className={`text-xs mt-0.5 ${pri.color}`}>{pri.label} · {ticket.category}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-2 space-y-4">
          <div className="tribal-card p-3">
            <p className="font-semibold text-sm text-[#212121]">{ticket.title}</p>
            {ticket.description && (
              <p className="text-xs text-[#6B5D45] mt-1">{ticket.description}</p>
            )}
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TicketStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Notes to Resident</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Mwambie mkazi maendeleo ya tatizo..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
            Save Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminTickets() {
  const [activeTab, setActiveTab] = useState("open");
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["maintenance", "estate", activeTab],
    queryFn: () => {
      const qs = activeTab === "all" ? "" : `?status=${activeTab}`;
      return api.get<MaintenanceTicket[]>(`/api/maintenance/estate${qs}`).then((r) => r.data);
    },
  });

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-3">
          {isLoading ? (
            <SectionLoader />
          ) : !tickets?.length ? (
            <div className="tribal-card p-10 text-center">
              <Wrench className="h-8 w-8 text-[#D4C9A8] mx-auto mb-2" />
              <p className="text-[#6B5D45] text-sm">No tickets in this view.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {tickets.map((t) => {
                const emoji = CATEGORY_EMOJI[t.category] ?? "📋";
                const pri = PRIORITY_CONFIG[t.priority];
                return (
                  <Card
                    key={t.id}
                    className={`cursor-pointer hover:border-[#1B5E20]/30 transition-colors ${
                      t.priority === "urgent" ? "border-[#B71C1C]/30 bg-[#B71C1C]/3" : ""
                    }`}
                    onClick={() => setSelectedTicket(t)}
                  >
                    <CardContent className="py-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#EDE7D8] flex items-center justify-center shrink-0 text-lg">
                          {emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-[#212121] truncate">{t.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs font-medium ${pri.color}`}>{pri.label}</span>
                            <span className="text-xs text-[#6B5D45]">· {t.category}</span>
                          </div>
                          {t.resident && (
                            <p className="text-xs text-[#6B5D45] mt-1 flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {t.resident.name}
                              {t.resident.unitNumber && ` · Unit ${t.resident.unitNumber}`}
                            </p>
                          )}
                          <p className="text-xs text-[#D4C9A8] mt-1">{formatRelative(t.createdAt)}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs shrink-0 min-h-[32px]"
                          onClick={(e) => { e.stopPropagation(); setSelectedTicket(t); }}
                        >
                          Update
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {selectedTicket && (
        <UpdateModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  );
}
