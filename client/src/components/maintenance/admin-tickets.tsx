import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Filter, AlertCircle, Clock, CheckCircle, User } from "lucide-react";
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

const priorityVariant: Record<TicketPriority, string> = {
  low: "secondary",
  medium: "info",
  high: "warning",
  urgent: "urgent",
};

const STATUSES: TicketStatus[] = ["open", "assigned", "in_progress", "resolved", "closed"];

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

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Ticket</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-2 space-y-4">
          <div>
            <p className="font-medium text-gray-900 text-sm">{ticket.title}</p>
            <p className="text-xs text-gray-500 mt-0.5 capitalize">
              {ticket.category} · {ticket.priority} priority
            </p>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TicketStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Admin Notes (visible to resident)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Update the resident on progress..."
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
      const statusFilter =
        activeTab === "all" ? "" : `?status=${activeTab}`;
      return api
        .get<MaintenanceTicket[]>(`/api/maintenance/estate${statusFilter}`)
        .then((r) => r.data);
    },
  });

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="open" className="flex-1">Open</TabsTrigger>
          <TabsTrigger value="in_progress" className="flex-1">Active</TabsTrigger>
          <TabsTrigger value="resolved" className="flex-1">Resolved</TabsTrigger>
          <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {isLoading ? (
            <SectionLoader />
          ) : tickets?.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">No tickets in this view.</p>
          ) : (
            <div className="space-y-2">
              {tickets?.map((t) => (
                <Card
                  key={t.id}
                  className="cursor-pointer hover:border-[#1A5C38]/30 transition-colors"
                  onClick={() => setSelectedTicket(t)}
                >
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{t.title}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant={priorityVariant[t.priority] as never}>
                            {t.priority}
                          </Badge>
                          <span className="text-xs text-gray-400 capitalize">{t.category}</span>
                        </div>
                        {t.resident && (
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {t.resident.name}
                            {t.resident.unitNumber && ` · Unit ${t.resident.unitNumber}`}
                          </p>
                        )}
                        <p className="text-xs text-gray-300 mt-1">{formatRelative(t.createdAt)}</p>
                      </div>
                      <Button size="sm" variant="secondary" className="text-xs shrink-0 min-h-[32px]">
                        Update
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
