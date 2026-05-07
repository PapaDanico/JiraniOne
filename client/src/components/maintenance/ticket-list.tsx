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

const STATUS_MAP: Record<TicketStatus, { label: string; variant: string; icon: React.ReactNode; bar: string }> = {
  open:        { label: "Wazi",      variant: "warning",   icon: <AlertCircle className="h-3 w-3" />, bar: "bg-amber-500" },
  assigned:    { label: "Amepewa",   variant: "info",      icon: <Clock className="h-3 w-3" />,       bar: "bg-blue-500" },
  in_progress: { label: "Inafanywa", variant: "default",   icon: <Clock className="h-3 w-3" />,       bar: "bg-[#1B5E20]" },
  resolved:    { label: "Imefanywa", variant: "success",   icon: <CheckCircle className="h-3 w-3" />, bar: "bg-[#1B5E20]" },
  closed:      { label: "Imefungwa", variant: "secondary", icon: <CheckCircle className="h-3 w-3" />, bar: "bg-[#D4C9A8]" },
};

const PRIORITY_MAP: Record<TicketPriority, { label: string; variant: string; color: string }> = {
  low:    { label: "Ndogo",   variant: "secondary", color: "text-[#6B5D45]" },
  medium: { label: "Wastani", variant: "info",      color: "text-amber-700" },
  high:   { label: "Kubwa",   variant: "warning",   color: "text-[#D47A00]" },
  urgent: { label: "Haraka",  variant: "urgent",    color: "text-[#B71C1C]" },
};

const CATEGORY_EMOJI: Record<string, string> = {
  plumbing: "🔧", electrical: "⚡", roads: "🛣️",
  landscaping: "🌿", security: "🔒", cleaning: "🧹", other: "📋",
};

export function TicketList() {
  const [formOpen, setFormOpen] = useState(false);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["maintenance", "my"],
    queryFn: () => api.get<MaintenanceTicket[]>("/api/maintenance/my").then((r) => r.data),
  });

  if (isLoading) return <SectionLoader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="section-label">Malalamiko Yangu</p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Ripoti Tatizo
        </Button>
      </div>

      {!tickets?.length ? (
        <div className="tribal-card p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#D47A00]/10 flex items-center justify-center mx-auto mb-3">
            <Wrench className="h-7 w-7 text-[#D47A00]" />
          </div>
          <p className="font-semibold text-[#212121] mb-1">Hakuna malalamiko</p>
          <p className="text-[#6B5D45] text-sm mb-4">Ripoti tatizo lolote la nyumba au mazingira</p>
          <Button variant="secondary" size="sm" onClick={() => setFormOpen(true)}>
            Ripoti Tatizo
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {tickets.map((t) => {
            const cfg = STATUS_MAP[t.status];
            const pri = PRIORITY_MAP[t.priority];
            const emoji = CATEGORY_EMOJI[t.category] ?? "📋";
            return (
              <Card key={t.id} className="overflow-hidden">
                <div className={`h-1 w-full ${cfg.bar}`} />
                <CardContent className="py-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#EDE7D8] flex items-center justify-center shrink-0 text-lg">
                      {emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[#212121] truncate">{t.title}</p>
                      <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                        <Badge variant={cfg.variant as never} className="flex items-center gap-1 text-xs">
                          {cfg.icon} {cfg.label}
                        </Badge>
                        <span className={`text-xs font-medium ${pri.color}`}>{pri.label}</span>
                      </div>
                      {t.adminNotes && (
                        <div className="mt-1.5 pl-2 border-l-2 border-[#1B5E20]/40">
                          <p className="text-xs text-[#1B5E20] font-medium">Maelezo ya Admin:</p>
                          <p className="text-xs text-[#1B5E20]/80">{t.adminNotes}</p>
                        </div>
                      )}
                      <p className="text-xs text-[#D4C9A8] mt-1.5">{formatRelative(t.createdAt)}</p>
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
