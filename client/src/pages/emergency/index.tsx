import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Phone, AlertTriangle, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEstate } from "@/hooks/useEstate";
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

const TYPES = [
  { value: "medical",  label: "🏥 Medical",   color: "bg-[#B71C1C]/10 text-[#B71C1C]" },
  { value: "fire",     label: "🔥 Fire",       color: "bg-orange-100 text-orange-700" },
  { value: "security", label: "🔒 Security",   color: "bg-amber-100 text-amber-800" },
  { value: "accident", label: "🚗 Accident",   color: "bg-purple-100 text-purple-700" },
  { value: "other",    label: "📋 Other",      color: "bg-[#EDE7D8] text-[#6B5D45]" },
] as const;

const typeColorMap: Record<string, string> = Object.fromEntries(TYPES.map((t) => [t.value, t.color]));

const STATUS_VARIANT: Record<string, "destructive" | "warning" | "success" | "default"> = {
  active: "destructive", responding: "warning", resolved: "success",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active", responding: "Responding", resolved: "Resolved",
};

// Fallback only — every estate should set its own security desk number
// (estates.securityPhone) so this generic placeholder isn't what residents
// actually reach in a real emergency.
const DEFAULT_SECURITY_PHONE = "0722 000 000";

function contactsFor(securityPhone: string | null | undefined) {
  return [
    { label: "Estate Security",  number: securityPhone || DEFAULT_SECURITY_PHONE, icon: "🛡️" },
    { label: "Police (Kenya)",   number: "999",           icon: "👮" },
    { label: "Ambulance (KNH)",  number: "0722 040 545", icon: "🚑" },
    { label: "Fire Brigade",     number: "020 222 2181", icon: "🚒" },
  ];
}

function RaiseAlertDialog({ onClose, securityPhone }: { onClose: () => void; securityPhone: string }) {
  const qc = useQueryClient();
  const [type, setType] = useState("medical");
  const [description, setDescription] = useState("");
  const [done, setDone] = useState(false);
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});

  // Best-effort GPS capture, requested as soon as the dialog opens so it's
  // likely ready by the time the resident hits Send. Never blocks or fails
  // the alert if permission is denied or the fix times out — a panic
  // button must never wait on GPS to notify security.
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  }, []);

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/api/emergency", {
        type,
        description: description || undefined,
        locationLat: coords.lat,
        locationLng: coords.lng,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emergency"] });
      setDone(true);
    },
  });

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-xl bg-[#B71C1C] flex items-center justify-center">
              <ShieldAlert className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-[#B71C1C]">Send Emergency Alert</DialogTitle>
              <p className="text-xs text-[#6B5D45] mt-0.5">Security and management will be notified immediately</p>
            </div>
          </div>
        </DialogHeader>

        {done ? (
          <div className="px-6 pb-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-[#1B5E20]/10 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-[#1B5E20]" />
            </div>
            <p className="font-bold text-[#212121] text-lg">Alert Sent!</p>
            <p className="text-sm text-[#6B5D45]">Security and management have been notified. Help is on the way.</p>
            <div className="tribal-card p-3">
              <p className="text-xs text-[#6B5D45] mb-1">Call security directly:</p>
              <a
                href={`tel:${securityPhone.replace(/\s/g, "")}`}
                className="flex items-center justify-center gap-2 text-[#1B5E20] font-bold"
              >
                <Phone className="h-4 w-4" /> {securityPhone}
              </a>
            </div>
            <Button className="w-full" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <>
            <div className="px-6 pb-2 space-y-4">
              <div>
                <Label className="text-[#212121] font-semibold">Emergency Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[#212121] font-semibold">Description (optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe the emergency..."
                  rows={3}
                />
              </div>
              {mutation.isError && (
                <div className="rounded-xl bg-[#B71C1C]/10 border border-[#B71C1C]/30 px-3 py-2.5 text-sm text-[#B71C1C]">
                  Couldn't send the alert — check your connection and try again, or call
                  security directly at {securityPhone}.
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button
                className="bg-[#B71C1C] hover:bg-[#8B0000] text-white gap-1.5"
                onClick={() => mutation.mutate()}
                loading={mutation.isPending}
              >
                <ShieldAlert className="h-4 w-4" /> Send Alert
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
  const { data: estate } = useEstate();
  const [alertOpen, setAlertOpen] = useState(false);
  const canViewAll = user?.role === "admin" || user?.role === "security";
  const securityPhone = estate?.securityPhone || DEFAULT_SECURITY_PHONE;
  const CONTACTS = contactsFor(estate?.securityPhone);

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
  // Which alert is being resolved — resolve.isPending alone put EVERY
  // card's button into a loading state when any one was clicked.
  const resolvingId = resolve.isPending ? resolve.variables : null;

  return (
    <div className="page-wrap" data-bottomnav="true">
      <TopBar title="Emergency" />
      <main className="container-list pt-4 space-y-5 page-content">

        {/* SOS button */}
        <button
          onClick={() => setAlertOpen(true)}
          className="sos-pulse w-full bg-[#B71C1C] hover:bg-[#8B0000] active:bg-[#5B0000] text-white font-bold text-xl rounded-2xl py-7 flex flex-col items-center justify-center gap-2.5 shadow-xl transition-colors min-h-[130px]"
        >
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <span className="text-2xl font-black tracking-wide">SOS — Send Alert</span>
          <span className="text-sm font-normal opacity-80">Tap to notify security immediately</span>
        </button>

        {/* Emergency contacts */}
        <div className="tribal-card p-4">
          <p className="section-label mb-3">Emergency Contacts</p>
          <div className="space-y-2">
            {CONTACTS.map((c) => (
              <div key={c.label} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{c.icon}</span>
                  <span className="text-sm font-medium text-[#212121]">{c.label}</span>
                </div>
                <a
                  href={`tel:${c.number.replace(/\s/g, "")}`}
                  className="flex items-center gap-1.5 text-sm font-bold text-[#1B5E20] bg-[#1B5E20]/8 rounded-xl px-3 py-1.5"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {c.number}
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Admin/Security: active alerts */}
        {canViewAll && (
          <section>
            <p className="section-label mb-3">Active Alerts</p>
            {isLoading ? (
              <SectionLoader />
            ) : !alerts?.length ? (
              <div className="tribal-card p-8 text-center">
                <AlertTriangle className="h-8 w-8 text-[#D4C9A8] mx-auto mb-2" />
                <p className="text-[#6B5D45] text-sm">No active emergency alerts.</p>
              </div>
            ) : (
              <div className="card-grid">
                {alerts.map((a) => (
                  <Card
                    key={a.id}
                    className={a.status === "active" ? "border-[#B71C1C]/30 bg-[#B71C1C]/4" : ""}
                  >
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${typeColorMap[a.type] ?? "bg-[#EDE7D8] text-[#6B5D45]"}`}>
                              {TYPES.find((t) => t.value === a.type)?.label ?? a.type}
                            </span>
                            <Badge variant={STATUS_VARIANT[a.status] ?? "default"}>
                              {STATUS_LABEL[a.status] ?? a.status}
                            </Badge>
                          </div>
                          {a.description && (
                            <p className="text-sm text-[#212121]">{a.description}</p>
                          )}
                          <p className="text-xs text-[#6B5D45] mt-1">
                            {(a as { userName?: string }).userName ?? "Resident"} · {formatRelative(a.createdAt)}
                          </p>
                        </div>
                        {a.status !== "resolved" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => resolve.mutate(a.id)}
                            loading={resolvingId === a.id}
                            className="text-xs shrink-0"
                          >
                            Mark Resolved
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

      {alertOpen && <RaiseAlertDialog onClose={() => setAlertOpen(false)} securityPhone={securityPhone} />}
      <BottomNav />
    </div>
  );
}
