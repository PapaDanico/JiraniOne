import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Wrench, AlertCircle, Clock, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TicketForm } from "./ticket-form";
import { SectionLoader } from "@/components/shared/loading";
import { formatRelative } from "@/lib/utils";
import type { MaintenanceTicket, TicketStatus, TicketPriority } from "@shared/types";

const statusConfig: Record<TicketStatus, { label: string; variant: string; icon: React.ReactNode }> = {
  open: { label: "Open", variant: "warning", icon: <AlertCircle className="h-3 w-3" /> },
  assigned: { label: "Assigned", variant: "info", icon: <Clock className="h-3 w-3" /> },
  in_progress: { label: "In Progress", variant: "default", icon: <Clock className="h-3 w-3" /> },
  resolved: { label: "Resolved", variant: "success", icon: <CheckCircle className="h-3 w-3" /> },
  closed: { label: "Closed", variant: "secondary", icon: <CheckCircle className="h-3 w-3" /> },
};

const priorityVariant: Record<TicketPriority, string> = {
  low: "secondary",
  medium: "info",
  high: "warning",
  urgent: "urgent",
};

export function TicketList() {
  const [formOpen, setFormOpen] = useState(false);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["maintenance", "my"],
    queryFn: () =>
      api.get<MaintenanceTicket[]>("/api/maintenance/my").then((r) => r.data),
  });

  if (isLoading) return <SectionLoader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">My Tickets</h2>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> Report Issue
        </Button>
      </div>

      {tickets?.length === 0 ? (
        <div className="text-center py-12">
          <Wrench className="h-12 w-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No maintenance tickets yet.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => setFormOpen(true)}>
            Report a problem
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets?.map((t) => {
            const cfg = statusConfig[t.status];
            return (
              <Card key={t.id}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{t.title}</p>
                      <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                        <Badge variant={cfg.variant as never} className="flex items-center gap-1">
                          {cfg.icon} {cfg.label}
                        </Badge>
                        <Badge variant={priorityVariant[t.priority] as never}>
                          {t.priority}
                        </Badge>
                        <span className="text-xs text-gray-400 capitalize">{t.category}</span>
                      </div>
                      {t.adminNotes && (
                        <p className="text-xs text-[#1A5C38] mt-1 border-l-2 border-[#1A5C38]/30 pl-2">
                          {t.adminNotes}
                        </p>
                      )}
                      <p className="text-xs text-gray-300 mt-1.5">{formatRelative(t.createdAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <TicketForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
