import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Phone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SectionLoader } from "@/components/shared/loading";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/utils";
import type { EmergencyAlert } from "@shared/types";

const TYPES = ["medical", "fire", "security", "accident", "other"] as const;

const typeColor: Record<string, string> = {
  medical: "bg-red-100 text-red-700",
  fire: "bg-orange-100 text-orange-700",
  security: "bg-yellow-100 text-yellow-700",
  accident: "bg-purple-100 text-purple-700",
  other: "bg-gray-100 text-gray-700",
};

const statusVariant: Record<string, "destructive" | "warning" | "success" | "default"> = {
  active: "destructive",
  responding: "warning",
  resolved: "success",
};

function RaiseAlertDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [type, setType] = useState("medical");
  const [description, setDescription] = useState("");
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => api.post("/api/emergency", { type, description: description || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emergency"] });
      setDone(true);
    },
  });

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-red-600">🚨 Raise Emergency Alert</DialogTitle>
        </DialogHeader>
        {done ? (
          <div className="px-6 pb-6 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-semibold text-gray-900">Alert sent to security and admin</p>
            <p className="text-sm text-gray-500 mt-1">Help is on the way. Stay calm.</p>
            <p className="text-sm font-medium text-gray-700 mt-4">
              Security: <a href="tel:+254722000000" className="text-[#1A5C38] underline">Call now</a>
            </p>
          </div>
        ) : (
          <>
            <div className="px-6 pb-2 space-y-4">
              <div>
                <Label>Emergency type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of situation..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button variant="destructive" onClick={() => mutation.mutate()} loading={mutation.isPending}>
                Send Alert
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function EmergencyPage() {
  const { user } = useAuth();
  const [alertOpen, setAlertOpen] = useState(false);
  const canViewAll = user?.role === "admin" || user?.role === "security";

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["emergency"],
    queryFn: () =>
      canViewAll
        ? api.get<EmergencyAlert[]>("/api/emergency").then((r) => r.data)
        : Promise.resolve([]),
    enabled: canViewAll,
  });

  const qc = useQueryClient();
  const resolve = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/api/emergency/${id}`, { status: "resolved" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emergency"] }),
  });

  return (
    <div className="min-h-screen bg-white pb-20">
      <TopBar title="Emergency" />
      <main className="max-w-lg mx-auto px-4 pt-4 space-y-5">

        {/* SOS Button */}
        <button
          onClick={() => setAlertOpen(true)}
          className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xl rounded-2xl py-6 flex flex-col items-center justify-center gap-2 shadow-lg transition-colors min-h-[120px]"
        >
          <ShieldAlert className="h-8 w-8" />
          <span>SOS — Raise Alert</span>
          <span className="text-sm font-normal opacity-80">Tap to notify security instantly</span>
        </button>

        {/* Emergency contacts */}
        <Card>
          <CardContent className="py-4 space-y-3">
            <p className="font-semibold text-sm text-gray-700">Emergency Contacts</p>
            <div className="space-y-2">
              {[
                { label: "Estate Security", number: "0722 000 000" },
                { label: "Police (Kenya)", number: "999" },
                { label: "Ambulance (KNH)", number: "0722 040 545" },
                { label: "Fire Brigade", number: "020 222 2181" },
              ].map((c) => (
                <div key={c.label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{c.label}</span>
                  <a
                    href={`tel:${c.number.replace(/\s/g, "")}`}
                    className="flex items-center gap-1.5 text-sm font-medium text-[#1A5C38]"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {c.number}
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Admin/Security: active alerts */}
        {canViewAll && (
          <section>
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">Active Alerts</h2>
            {isLoading ? (
              <SectionLoader />
            ) : !alerts?.length ? (
              <p className="text-sm text-gray-400 text-center py-6">No active alerts.</p>
            ) : (
              <div className="space-y-2">
                {alerts.map((a) => (
                  <Card key={a.id} className={a.status === "active" ? "border-red-200 bg-red-50/40" : ""}>
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium rounded-full px-2 py-0.5 capitalize ${typeColor[a.type] ?? ""}`}>
                              {a.type}
                            </span>
                            <Badge variant={statusVariant[a.status] ?? "default"}>{a.status}</Badge>
                          </div>
                          {a.description && (
                            <p className="text-sm text-gray-700">{a.description}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {(a as { userName?: string }).userName ?? "Unknown"} · {formatRelative(a.createdAt)}
                          </p>
                        </div>
                        {a.status !== "resolved" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => resolve.mutate(a.id)}
                            loading={resolve.isPending}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {alertOpen && <RaiseAlertDialog onClose={() => setAlertOpen(false)} />}
      <BottomNav />
    </div>
  );
}
