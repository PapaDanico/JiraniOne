import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { CarpoolOffer } from "@shared/types";

function formatDeparture(iso: string) {
  return new Date(iso).toLocaleString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusColors: Record<CarpoolOffer["status"], string> = {
  active: "bg-green-100 text-green-800",
  full: "bg-amber-100 text-amber-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-gray-100 text-gray-600",
};

interface OfferForm {
  origin: string;
  destination: string;
  departureTime: string;
  seatsTotal: number;
  fare: string;
  notes: string;
}

const defaultForm: OfferForm = {
  origin: "",
  destination: "",
  departureTime: "",
  seatsTotal: 3,
  fare: "",
  notes: "",
};

export default function CarpoolPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<OfferForm>(defaultForm);
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<{ type: "booking" | "offer"; id: string } | null>(null);

  const { data: offers = [], isLoading } = useQuery<CarpoolOffer[]>({
    queryKey: ["carpool"],
    queryFn: () => api.get<CarpoolOffer[]>("/api/carpool").then((r) => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["carpool"] });
  const onActionError = (e: unknown, fallback: string) =>
    setActionError(e instanceof ApiError ? e.message : fallback);

  const createOffer = useMutation({
    mutationFn: (body: object) => api.post("/api/carpool", body),
    onSuccess: () => { invalidate(); setShowForm(false); setForm(defaultForm); setFormError(""); },
    onError: (e) => setFormError(e instanceof ApiError ? e.message : "Failed to post ride offer."),
  });

  const cancelOffer = useMutation({
    mutationFn: (id: string) => api.delete(`/api/carpool/${id}`),
    onSuccess: () => { setActionError(""); setConfirmTarget(null); invalidate(); },
    onError: (e) => onActionError(e, "Failed to cancel ride offer."),
  });

  const bookSeat = useMutation({
    mutationFn: (id: string) => api.post(`/api/carpool/${id}/book`, {}),
    onSuccess: () => { setActionError(""); invalidate(); },
    onError: (e) => onActionError(e, "Failed to book seat."),
  });

  const cancelBooking = useMutation({
    mutationFn: (id: string) => api.delete(`/api/carpool/${id}/book`),
    onSuccess: () => { setActionError(""); setConfirmTarget(null); invalidate(); },
    onError: (e) => onActionError(e, "Failed to cancel booking."),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createOffer.mutate({
      origin: form.origin,
      destination: form.destination,
      departureTime: form.departureTime,
      seatsTotal: form.seatsTotal,
      ...(form.fare ? { fare: Math.trunc(Number(form.fare)) } : {}),
      ...(form.notes ? { notes: form.notes } : {}),
    });
  }

  function set(field: keyof OfferForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  return (
    <div className="page-wrap">
      <TopBar title="Carpool" />
      <main className="container-list pt-5 pb-6 space-y-5 page-content">

        {/* Offer a Ride toggle */}
        <button
          onClick={() => setShowForm((v) => !v)}
          className="w-full py-2.5 rounded-xl font-semibold text-white text-sm"
          style={{ background: "#1B5E20" }}
        >
          {showForm ? "✕ Cancel" : "+ Offer a Ride"}
        </button>

        {/* Inline offer form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="tribal-card p-4 space-y-3">
            <h3 className="font-bold text-base" style={{ color: "#6B5D45" }}>New Ride Offer</h3>
            {[
              { label: "From (origin)", field: "origin" as const, type: "text", required: true },
              { label: "To (destination)", field: "destination" as const, type: "text", required: true },
            ].map(({ label, field, type, required }) => {
              const val = form[field] as string;
              const tooShort = val.length > 0 && val.trim().length < 2;
              return (
                <div key={field}>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#6B5D45" }}>{label}</label>
                  <input
                    type={type}
                    value={val}
                    onChange={set(field)}
                    required={required}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2"
                    style={{ borderColor: tooShort ? "#B71C1C" : "#D4A017", color: "#6B5D45" }}
                  />
                  {tooShort && (
                    <p className="text-xs mt-1" style={{ color: "#B71C1C" }}>At least 2 characters</p>
                  )}
                </div>
              );
            })}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#6B5D45" }}>Departure Time</label>
              <input
                type="datetime-local"
                value={form.departureTime}
                onChange={set("departureTime")}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2"
                style={{ borderColor: "#D4A017", color: "#6B5D45" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#6B5D45" }}>Seats (1–6)</label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={form.seatsTotal}
                  onChange={(e) => setForm((p) => ({ ...p, seatsTotal: Number(e.target.value) }))}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
                  style={{ borderColor: "#D4A017", color: "#6B5D45" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#6B5D45" }}>Fare (KES, optional)</label>
                <input
                  type="number"
                  min={0}
                  value={form.fare}
                  onChange={set("fare")}
                  placeholder="Free"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
                  style={{ borderColor: "#D4A017", color: "#6B5D45" }}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#6B5D45" }}>Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={set("notes")}
                rows={2}
                placeholder="e.g. meeting point, luggage space..."
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none resize-none"
                style={{ borderColor: "#D4A017", color: "#6B5D45" }}
              />
            </div>
            {formError && (
              <p className="text-xs font-medium" style={{ color: "#B71C1C" }}>{formError}</p>
            )}
            <button
              type="submit"
              disabled={createOffer.isPending}
              className="w-full py-2 rounded-xl font-semibold text-white text-sm disabled:opacity-60"
              style={{ background: "#1B5E20" }}
            >
              {createOffer.isPending ? "Posting…" : "Post Ride"}
            </button>
          </form>
        )}

        {actionError && (
          <p className="text-xs font-medium text-center" style={{ color: "#B71C1C" }}>{actionError}</p>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="tribal-card p-4 animate-pulse space-y-2">
                <div className="h-4 rounded bg-gray-200 w-3/4" />
                <div className="h-3 rounded bg-gray-200 w-1/2" />
                <div className="h-3 rounded bg-gray-200 w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && offers.length === 0 && (
          <div className="tribal-card p-8 text-center">
            <p className="text-2xl mb-2">🚗</p>
            <p className="font-semibold" style={{ color: "#6B5D45" }}>No rides available</p>
            <p className="text-sm mt-1 text-gray-500">Be the first to offer a ride in your estate!</p>
          </div>
        )}

        {/* Offer cards */}
        <div className="card-grid">
        {!isLoading && offers.map((offer) => {
          const isDriver = offer.driverId === user?.id;
          const canBook = !isDriver && !offer.myBooking && offer.seatsAvailable > 0 && offer.status === "active";
          const canCancelBooking = !!offer.myBooking && offer.myBooking.status !== "cancelled";

          return (
            <div key={offer.id} className="tribal-card p-4 space-y-2">
              {/* Route + status */}
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-base leading-tight" style={{ color: "#1B5E20" }}>
                  {offer.origin} → {offer.destination}
                </p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${statusColors[offer.status]}`}>
                  {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                </span>
              </div>

              {/* Departure */}
              <p className="text-sm font-medium" style={{ color: "#D4A017" }}>
                🕐 {formatDeparture(offer.departureTime)}
              </p>

              {/* Driver */}
              <p className="text-xs" style={{ color: "#6B5D45" }}>
                Driver: <span className="font-semibold">{offer.driver?.name ?? "Unknown"}</span>
                {offer.driver?.unitNumber ? ` · Unit ${offer.driver.unitNumber}` : ""}
                {isDriver ? " (you)" : ""}
              </p>

              {/* Seats + fare */}
              <div className="flex items-center gap-4 text-xs" style={{ color: "#6B5D45" }}>
                <span>🪑 {offer.seatsAvailable} of {offer.seatsTotal} seats available</span>
                <span>💰 {offer.fare ? `KES ${offer.fare}` : "Free"}</span>
              </div>

              {/* Notes */}
              {offer.notes && (
                <p className="text-xs italic text-gray-500">"{offer.notes}"</p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                {canBook && (
                  <button
                    onClick={() => bookSeat.mutate(offer.id)}
                    disabled={bookSeat.isPending}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-60"
                    style={{ background: "#1B5E20" }}
                  >
                    Book Seat
                  </button>
                )}
                {canCancelBooking && (
                  <button
                    onClick={() => setConfirmTarget({ type: "booking", id: offer.id })}
                    disabled={cancelBooking.isPending}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-60"
                    style={{ borderColor: "#D4A017", color: "#6B5D45" }}
                  >
                    Cancel Booking
                  </button>
                )}
                {isDriver && offer.status === "active" && (
                  <button
                    onClick={() => setConfirmTarget({ type: "offer", id: offer.id })}
                    disabled={cancelOffer.isPending}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-red-300 text-red-600 disabled:opacity-60"
                  >
                    Cancel Offer
                  </button>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </main>
      <BottomNav />
      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(v) => { if (!v) setConfirmTarget(null); }}
        title={confirmTarget?.type === "offer" ? "Cancel this ride offer?" : "Cancel your booking?"}
        description={
          confirmTarget?.type === "offer"
            ? "Any passengers who booked a seat will lose their booking. This can't be undone."
            : "You'll give up your seat on this ride."
        }
        confirmLabel={confirmTarget?.type === "offer" ? "Cancel Offer" : "Cancel Booking"}
        cancelLabel="Keep it"
        loading={cancelOffer.isPending || cancelBooking.isPending}
        onConfirm={() => {
          if (!confirmTarget) return;
          if (confirmTarget.type === "offer") cancelOffer.mutate(confirmTarget.id);
          else cancelBooking.mutate(confirmTarget.id);
        }}
      />
    </div>
  );
}
