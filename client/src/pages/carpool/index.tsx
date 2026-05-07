import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { api } from "@/lib/api";
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

  const { data: offers = [], isLoading } = useQuery<CarpoolOffer[]>({
    queryKey: ["carpool"],
    queryFn: () => api.get<CarpoolOffer[]>("/api/carpool").then((r) => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["carpool"] });

  const createOffer = useMutation({
    mutationFn: (body: object) => api.post("/api/carpool", body),
    onSuccess: () => { invalidate(); setShowForm(false); setForm(defaultForm); },
  });

  const cancelOffer = useMutation({
    mutationFn: (id: string) => api.delete(`/api/carpool/${id}`),
    onSuccess: invalidate,
  });

  const bookSeat = useMutation({
    mutationFn: (id: string) => api.post(`/api/carpool/${id}/book`, {}),
    onSuccess: invalidate,
  });

  const cancelBooking = useMutation({
    mutationFn: (id: string) => api.delete(`/api/carpool/${id}/book`),
    onSuccess: invalidate,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createOffer.mutate({
      origin: form.origin,
      destination: form.destination,
      departureTime: new Date(form.departureTime).toISOString(),
      seatsTotal: form.seatsTotal,
      ...(form.fare ? { fare: form.fare } : {}),
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
      <main className="max-w-lg mx-auto px-4 pt-5 pb-6 space-y-5 page-content">

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
            ].map(({ label, field, type, required }) => (
              <div key={field}>
                <label className="block text-xs font-medium mb-1" style={{ color: "#6B5D45" }}>{label}</label>
                <input
                  type={type}
                  value={form[field] as string}
                  onChange={set(field)}
                  required={required}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2"
                  style={{ borderColor: "#D4A017", color: "#6B5D45" }}
                />
              </div>
            ))}
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
                    onClick={() => cancelBooking.mutate(offer.id)}
                    disabled={cancelBooking.isPending}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-60"
                    style={{ borderColor: "#D4A017", color: "#6B5D45" }}
                  >
                    Cancel Booking
                  </button>
                )}
                {isDriver && offer.status === "active" && (
                  <button
                    onClick={() => cancelOffer.mutate(offer.id)}
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
      </main>
      <BottomNav />
    </div>
  );
}
