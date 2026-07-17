import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, QrCode, Clock, CheckCircle, XCircle, Ban, Users } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CreateVisitorPass } from "./create-visitor-pass";
import { VisitorQrModal } from "./visitor-qr-modal";
import { SectionLoader } from "@/components/shared/loading";
import { formatRelative, formatDateTime } from "@/lib/utils";
import type { Visitor, VisitorStatus } from "@shared/types";

const statusConfig: Record<VisitorStatus, {
  label: string;
  variant: "default" | "success" | "secondary" | "warning" | "destructive";
  icon: React.ReactNode;
  barColor: string;
}> = {
  pending:     { label: "Expected",  variant: "warning",     icon: <Clock className="h-3 w-3" />,       barColor: "bg-amber-400" },
  checked_in:  { label: "Inside",    variant: "default",     icon: <CheckCircle className="h-3 w-3" />, barColor: "bg-[#1B5E20]" },
  checked_out: { label: "Left",      variant: "secondary",   icon: <XCircle className="h-3 w-3" />,     barColor: "bg-[#6B5D45]" },
  expired:     { label: "Expired",   variant: "secondary",   icon: <Ban className="h-3 w-3" />,         barColor: "bg-[#D4C9A8]" },
  cancelled:   { label: "Cancelled", variant: "destructive", icon: <Ban className="h-3 w-3" />,         barColor: "bg-[#B71C1C]" },
};

export function VisitorList() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [qrVisitor, setQrVisitor] = useState<Visitor | null>(null);

  const { data: visitors, isLoading } = useQuery({
    queryKey: ["visitors", "my"],
    queryFn: () => api.get<Visitor[]>("/api/visitors/my").then((r) => r.data),
  });

  const [cancelError, setCancelError] = useState<string | null>(null);
  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/visitors/${id}/cancel`),
    onSuccess: () => { setCancelError(null); qc.invalidateQueries({ queryKey: ["visitors", "my"] }); },
    onError: (err) => {
      setCancelError(err instanceof ApiError ? err.message : "Failed to cancel visitor pass. Please try again.");
    },
  });

  if (isLoading) return <SectionLoader />;

  const active = visitors?.filter((v) => v.status === "pending" || v.status === "checked_in") ?? [];
  const past   = visitors?.filter((v) => v.status !== "pending" && v.status !== "checked_in") ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-[#212121] text-lg">My Visitors</h2>
          <p className="text-xs text-[#6B5D45]">Passes you've created for visitors</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Pass
        </Button>
      </div>

      {cancelError && (
        <p className="text-xs text-[#B71C1C] font-medium">{cancelError}</p>
      )}

      {visitors?.length === 0 ? (
        <div className="tribal-card p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1B5E20]/10 flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-[#1B5E20]/40" />
          </div>
          <p className="font-semibold text-[#212121] mb-1">No visitors yet</p>
          <p className="text-[#6B5D45] text-sm mb-4">Invite your first visitor to the estate</p>
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
            Create First Pass
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {active.length > 0 && (
            <div>
              <p className="section-label mb-2">Expected / Inside ({active.length})</p>
              <div className="space-y-2">
                {active.map((v) => <VisitorCard key={v.id} v={v} onShowQr={setQrVisitor} onCancel={(id) => cancelMutation.mutate(id)} cancelling={cancelMutation.isPending} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="section-label mb-2">History ({past.length})</p>
              <div className="space-y-2">
                {past.map((v) => <VisitorCard key={v.id} v={v} onShowQr={setQrVisitor} onCancel={(id) => cancelMutation.mutate(id)} cancelling={cancelMutation.isPending} />)}
              </div>
            </div>
          )}
        </div>
      )}

      <CreateVisitorPass open={createOpen} onClose={() => setCreateOpen(false)} />
      {qrVisitor && <VisitorQrModal visitor={qrVisitor} onClose={() => setQrVisitor(null)} />}
    </div>
  );
}

function VisitorCard({
  v, onShowQr, onCancel, cancelling,
}: {
  v: Visitor;
  onShowQr: (v: Visitor) => void;
  onCancel: (id: string) => void;
  cancelling: boolean;
}) {
  const cfg = statusConfig[v.status];
  return (
    <Card className={v.status === "checked_in" ? "border-[#1B5E20]/30 bg-[#1B5E20]/5" : ""}>
      <CardContent className="py-0 px-0 overflow-hidden">
        {/* Status bar */}
        <div className={`h-1 w-full rounded-t-2xl ${cfg.barColor}`} />
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm text-[#212121]">{v.name}</span>
                <Badge variant={cfg.variant as never} className="flex items-center gap-1">
                  {cfg.icon} {cfg.label}
                </Badge>
              </div>
              <p className="text-xs text-[#6B5D45]">{v.phone}</p>
              {v.purpose && <p className="text-xs text-[#6B5D45] mt-0.5 italic">"{v.purpose}"</p>}
              {v.expectedAt && (
                <p className="text-xs text-[#6B5D45] mt-0.5 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Expected: {formatDateTime(v.expectedAt)}
                </p>
              )}
              {v.checkedInAt && (
                <p className="text-xs text-[#1B5E20] mt-0.5 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Checked in: {formatRelative(v.checkedInAt)}
                </p>
              )}
              <p className="text-xs text-[#D4C9A8] mt-1">{formatRelative(v.createdAt)}</p>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              {v.status === "pending" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onShowQr(v)}
                    className="text-xs px-2 min-h-[32px] gap-1"
                  >
                    <QrCode className="h-3.5 w-3.5" /> QR
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onCancel(v.id)}
                    loading={cancelling}
                    className="text-xs px-2 min-h-[32px]"
                  >
                    Cancel
                  </Button>
                </>
              )}
              {v.status === "checked_in" && (
                <Button size="sm" variant="outline" onClick={() => onShowQr(v)} className="text-xs px-2 min-h-[32px] gap-1">
                  <QrCode className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
