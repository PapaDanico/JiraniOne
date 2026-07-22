import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package, PackageCheck, PackageOpen, PackageX,
  Plus, ChevronDown, ChevronUp, Loader2, Trash2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { api, ApiError } from "@/lib/api";
import { SectionLoader } from "@/components/shared/loading";
import { formatRelative } from "@/lib/utils";
import type { Parcel } from "@shared/types";

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
  expected:  { label: "Expected",   icon: <Package className="h-3.5 w-3.5" />,      color: "text-sky-700",     bg: "bg-sky-100" },
  at_gate:   { label: "At Gate",    icon: <PackageCheck className="h-3.5 w-3.5" />,  color: "text-[#D47A00]",   bg: "bg-[#D47A00]/10" },
  collected: { label: "Collected",  icon: <PackageOpen className="h-3.5 w-3.5" />,   color: "text-[#1B5E20]",   bg: "bg-[#1B5E20]/10" },
  returned:  { label: "Returned",   icon: <PackageX className="h-3.5 w-3.5" />,      color: "text-[#B71C1C]",   bg: "bg-[#B71C1C]/10" },
};

function StatusBadge({ status }: { status: Parcel["status"] }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.expected;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Register Parcel Modal ─────────────────────────────────────────────────────

function RegisterParcelModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [description, setDescription] = useState("");
  const [trackingRef, setTrackingRef] = useState("");
  const [sender, setSender] = useState("");
  const [error, setError] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      api.post("/api/parcels", { description, trackingRef, sender }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parcels", "my"] });
      setDescription(""); setTrackingRef(""); setSender(""); setError("");
      onClose();
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : "Failed to register parcel.");
    },
  });

  function handleSubmit() {
    if (!description.trim()) { setError("Please describe the parcel."); return; }
    setError("");
    mutate();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle className="tribal-heading">Register Expected Parcel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="desc">Description *</Label>
            <Input
              id="desc"
              placeholder="e.g. Amazon box, Jumia order #12345"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tracking">Tracking Reference (optional)</Label>
            <Input
              id="tracking"
              placeholder="e.g. JM123456789KE"
              value={trackingRef}
              onChange={(e) => setTrackingRef(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sender">Sender / Courier (optional)</Label>
            <Input
              id="sender"
              placeholder="e.g. Jumia, G4S, DHL"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-[#B71C1C] bg-[#B71C1C]/8 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending} className="bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Mark Received Modal (security/admin) ─────────────────────────────────────

function MarkReceivedModal({
  parcel,
  onClose,
}: {
  parcel: Parcel | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      api.patch(`/api/parcels/${parcel!.id}/received`, { notes }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parcels", "estate"] });
      setNotes(""); setError("");
      onClose();
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : "Failed to update parcel.");
    },
  });

  return (
    <Dialog open={!!parcel} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle className="tribal-heading">Mark Parcel Received</DialogTitle>
        </DialogHeader>

        {parcel && (
          <div className="space-y-4 py-1">
            <div className="bg-[#EDE7D8] rounded-xl p-3 text-sm">
              <p className="font-semibold text-[#212121]">{parcel.description}</p>
              {parcel.resident && (
                <p className="text-[#6B5D45] mt-0.5">
                  Resident: {parcel.resident.name}
                  {parcel.resident.unitNumber ? ` · Unit ${parcel.resident.unitNumber}` : ""}
                </p>
              )}
              {parcel.sender && <p className="text-[#6B5D45] text-xs mt-0.5">From: {parcel.sender}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                placeholder="e.g. Large box, fragile"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-[#B71C1C] bg-[#B71C1C]/8 rounded-lg px-3 py-2">{error}</p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={() => mutate()} disabled={isPending} className="bg-[#D47A00] hover:bg-[#D47A00]/90 text-white">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Received"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Resident view ─────────────────────────────────────────────────────────────

function ResidentParcels() {
  const qc = useQueryClient();
  const [showRegister, setShowRegister] = useState(false);
  const [actionError, setActionError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["parcels", "my"],
    queryFn: () => api.get<Parcel[]>("/api/parcels/my").then((r) => r.data),
  });

  const { mutate: markCollected } = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/api/parcels/${id}/collected`, {}).then((r) => r.data),
    onSuccess: () => { setActionError(""); qc.invalidateQueries({ queryKey: ["parcels", "my"] }); },
    onError: (e) => setActionError(e instanceof ApiError ? e.message : "Failed to mark parcel collected."),
  });

  const { mutate: deleteParcel, isPending: deletingParcel } = useMutation({
    mutationFn: (id: string) => api.delete(`/api/parcels/${id}`).then((r) => r.data),
    onSuccess: () => {
      setActionError("");
      setConfirmDeleteId(null);
      qc.invalidateQueries({ queryKey: ["parcels", "my"] });
    },
    onError: (e) => setActionError(e instanceof ApiError ? e.message : "Failed to delete parcel."),
  });

  const active   = data?.filter((p) => p.status !== "collected" && p.status !== "returned") ?? [];
  const history  = data?.filter((p) => p.status === "collected" || p.status === "returned") ?? [];

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="section-label">My Parcels</p>
        <Button
          size="sm"
          onClick={() => setShowRegister(true)}
          className="bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> Register
        </Button>
      </div>

      {actionError && (
        <p className="text-xs text-[#B71C1C] font-medium mb-3">{actionError}</p>
      )}

      {isLoading ? (
        <SectionLoader />
      ) : active.length === 0 && history.length === 0 ? (
        <div className="tribal-card p-10 text-center">
          <Package className="h-12 w-12 text-[#D4C9A8] mx-auto mb-3" />
          <p className="font-semibold text-[#212121] mb-1">No parcels yet</p>
          <p className="text-sm text-[#6B5D45]">Register a parcel you're expecting and we'll notify you when it arrives at the gate.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="card-grid">
            {active.map((p) => (
              <ParcelCard
                key={p.id}
                parcel={p}
                onCollect={() => markCollected(p.id)}
                onDelete={() => setConfirmDeleteId(p.id)}
                isResident
              />
            ))}
          </div>

          {history.length > 0 && (
            <>
              <p className="section-label pt-2">History</p>
              <div className="card-grid">
                {history.map((p) => (
                  <ParcelCard key={p.id} parcel={p} isResident readOnly />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <RegisterParcelModal open={showRegister} onClose={() => setShowRegister(false)} />
      <ConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={(v) => { if (!v) setConfirmDeleteId(null); }}
        title="Delete this parcel?"
        description="This removes the parcel record entirely. This can't be undone."
        confirmLabel="Delete"
        loading={deletingParcel}
        onConfirm={() => confirmDeleteId && deleteParcel(confirmDeleteId)}
      />
    </>
  );
}

// ─── Security/Admin view ───────────────────────────────────────────────────────

function EstateParcels() {
  const qc = useQueryClient();
  const [receivingParcel, setReceivingParcel] = useState<Parcel | null>(null);
  const [actionError, setActionError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["parcels", "estate"],
    queryFn: () =>
      api.get<Parcel[]>("/api/parcels/estate").then((r) => r.data),
  });

  const { mutate: markCollected } = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/api/parcels/${id}/collected`, {}).then((r) => r.data),
    onSuccess: () => { setActionError(""); qc.invalidateQueries({ queryKey: ["parcels", "estate"] }); },
    onError: (e) => setActionError(e instanceof ApiError ? e.message : "Failed to mark parcel collected."),
  });

  const pending   = data?.filter((p) => p.status === "expected" || p.status === "at_gate") ?? [];
  const completed = data?.filter((p) => p.status === "collected" || p.status === "returned") ?? [];

  return (
    <>
      <p className="section-label mb-4">Estate Parcels</p>

      {actionError && (
        <p className="text-xs text-[#B71C1C] font-medium mb-3">{actionError}</p>
      )}

      {isLoading ? (
        <SectionLoader />
      ) : pending.length === 0 && completed.length === 0 ? (
        <div className="tribal-card p-10 text-center">
          <Package className="h-12 w-12 text-[#D4C9A8] mx-auto mb-3" />
          <p className="text-[#6B5D45] text-sm">No parcels registered.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="card-grid">
            {pending.map((p) => (
              <ParcelCard
                key={p.id}
                parcel={p}
                onReceive={() => setReceivingParcel(p)}
                onCollect={() => markCollected(p.id)}
              />
            ))}
          </div>

          {completed.length > 0 && (
            <>
              <p className="section-label pt-2">Recent History</p>
              <div className="card-grid">
                {completed.slice(0, 15).map((p) => (
                  <ParcelCard key={p.id} parcel={p} readOnly />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <MarkReceivedModal
        parcel={receivingParcel}
        onClose={() => setReceivingParcel(null)}
      />
    </>
  );
}

// ─── Parcel Card ───────────────────────────────────────────────────────────────

function ParcelCard({
  parcel,
  onReceive,
  onCollect,
  onDelete,
  isResident = false,
  readOnly = false,
}: {
  parcel: Parcel;
  onReceive?: () => void;
  onCollect?: () => void;
  onDelete?: () => void;
  isResident?: boolean;
  readOnly?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="tribal-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <StatusBadge status={parcel.status} />
            {parcel.trackingRef && (
              <span className="text-xs text-[#6B5D45] font-mono bg-[#EDE7D8] px-1.5 py-0.5 rounded">
                {parcel.trackingRef}
              </span>
            )}
          </div>
          <p className="font-semibold text-sm text-[#212121] truncate">{parcel.description}</p>
          {parcel.resident && (
            <p className="text-xs text-[#6B5D45] mt-0.5">
              {parcel.resident.name}{parcel.resident.unitNumber ? ` · Unit ${parcel.resident.unitNumber}` : ""}
            </p>
          )}
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-[#D4C9A8] hover:text-[#6B5D45] transition-colors shrink-0 mt-0.5"
          aria-label="Toggle details"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-[#D4C9A8]/50 space-y-1 text-xs text-[#6B5D45]">
          {parcel.sender    && <p>Courier / Sender: <strong className="text-[#212121]">{parcel.sender}</strong></p>}
          {parcel.receivedAt && <p>Arrived at gate: <strong className="text-[#212121]">{formatRelative(parcel.receivedAt)}</strong></p>}
          {parcel.collectedAt && <p>Collected: <strong className="text-[#212121]">{formatRelative(parcel.collectedAt)}</strong></p>}
          {parcel.notes     && <p>Notes: <strong className="text-[#212121]">{parcel.notes}</strong></p>}
          {parcel.receivedBy && <p>Received by: <strong className="text-[#212121]">{parcel.receivedBy.name}</strong></p>}
          <p>Registered: {formatRelative(parcel.createdAt)}</p>
        </div>
      )}

      {!readOnly && (
        <div className="flex gap-2 mt-3">
          {/* Security: mark at_gate */}
          {!isResident && parcel.status === "expected" && onReceive && (
            <Button
              size="sm"
              variant="outline"
              className="text-[#D47A00] border-[#D47A00]/40 hover:bg-[#D47A00]/8 text-xs h-7"
              onClick={onReceive}
            >
              Mark Received
            </Button>
          )}
          {/* Security or resident: mark collected */}
          {parcel.status === "at_gate" && onCollect && (
            <Button
              size="sm"
              className="bg-[#1B5E20] hover:bg-[#1B5E20]/90 text-white text-xs h-7"
              onClick={onCollect}
            >
              Mark Collected
            </Button>
          )}
          {/* Resident: delete expected */}
          {isResident && parcel.status === "expected" && onDelete && (
            <Button
              size="sm"
              variant="outline"
              className="text-[#B71C1C] border-[#B71C1C]/30 hover:bg-[#B71C1C]/8 text-xs h-7 ml-auto"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Remove
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ParcelsPage() {
  const { user } = useAuth();
  const isStaff = user?.role === "admin" || user?.role === "security";

  return (
    <div className="page-wrap" data-bottomnav="true">
      <TopBar title="Parcels" />

      <main className="container-list pt-5 pb-6 page-content">
        {isStaff ? <EstateParcels /> : <ResidentParcels />}
      </main>

      <BottomNav />
    </div>
  );
}
