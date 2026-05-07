import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, QrCode, Clock, CheckCircle, XCircle, Ban } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CreateVisitorPass } from "./create-visitor-pass";
import { VisitorQrModal } from "./visitor-qr-modal";
import { SectionLoader } from "@/components/shared/loading";
import { formatRelative, formatDateTime } from "@/lib/utils";
import type { Visitor, VisitorStatus } from "@shared/types";

const statusConfig: Record<VisitorStatus, { label: string; variant: "default" | "success" | "secondary" | "warning" | "destructive"; icon: React.ReactNode }> = {
  pending: { label: "Pending", variant: "warning", icon: <Clock className="h-3 w-3" /> },
  checked_in: { label: "Inside", variant: "success" as "default", icon: <CheckCircle className="h-3 w-3" /> },
  checked_out: { label: "Left", variant: "secondary", icon: <XCircle className="h-3 w-3" /> },
  expired: { label: "Expired", variant: "secondary", icon: <Ban className="h-3 w-3" /> },
  cancelled: { label: "Cancelled", variant: "destructive" as "destructive", icon: <Ban className="h-3 w-3" /> },
};

export function VisitorList() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [qrVisitor, setQrVisitor] = useState<Visitor | null>(null);

  const { data: visitors, isLoading } = useQuery({
    queryKey: ["visitors", "my"],
    queryFn: () => api.get<Visitor[]>("/api/visitors/my").then((r) => r.data),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/visitors/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["visitors", "my"] }),
  });

  if (isLoading) return <SectionLoader />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">My Visitors</h2>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Pass
        </Button>
      </div>

      {visitors?.length === 0 ? (
        <div className="text-center py-12">
          <QrCode className="h-12 w-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No visitor passes yet.</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => setCreateOpen(true)}
          >
            Create your first pass
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {visitors?.map((v) => {
            const cfg = statusConfig[v.status];
            return (
              <Card key={v.id}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900">{v.name}</span>
                        <Badge
                          variant={cfg.variant as never}
                          className="flex items-center gap-1"
                        >
                          {cfg.icon}
                          {cfg.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">{v.phone}</p>
                      {v.purpose && <p className="text-xs text-gray-400 mt-0.5">{v.purpose}</p>}
                      {v.expectedAt && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Expected: {formatDateTime(v.expectedAt)}
                        </p>
                      )}
                      <p className="text-xs text-gray-300 mt-1">{formatRelative(v.createdAt)}</p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {v.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setQrVisitor(v)}
                            className="text-xs px-2 min-h-[32px]"
                          >
                            <QrCode className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => cancelMutation.mutate(v.id)}
                            loading={cancelMutation.isPending}
                            className="text-xs px-2 min-h-[32px]"
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                      {v.status === "checked_in" && (
                        <span className="text-xs text-green-600 font-medium">
                          Checked in {formatRelative(v.checkedInAt!)}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateVisitorPass open={createOpen} onClose={() => setCreateOpen(false)} />
      {qrVisitor && (
        <VisitorQrModal visitor={qrVisitor} onClose={() => setQrVisitor(null)} />
      )}
    </div>
  );
}
