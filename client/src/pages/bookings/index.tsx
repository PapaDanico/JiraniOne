import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Plus, Clock, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SectionLoader } from "@/components/shared/loading";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { Facility, Booking } from "@shared/types";

const STATUS_ICON = {
  approved:  <CheckCircle className="h-4 w-4 text-[#1B5E20]" />,
  pending:   <Clock className="h-4 w-4 text-amber-500" />,
  rejected:  <XCircle className="h-4 w-4 text-[#B71C1C]" />,
  cancelled: <XCircle className="h-4 w-4 text-[#D4C9A8]" />,
  completed: <CheckCircle className="h-4 w-4 text-[#D4C9A8]" />,
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "default"> = {
  approved: "success", pending: "warning", rejected: "destructive",
  cancelled: "default", completed: "default",
};

const STATUS_LABEL: Record<string, string> = {
  approved: "Approved", pending: "Pending",
  rejected: "Rejected", cancelled: "Cancelled", completed: "Completed",
};

function BookDialog({ facility, onClose }: { facility: Facility; onClose: () => void }) {
  const qc = useQueryClient();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.post("/api/facilities/bookings", {
      facilityId: facility.id,
      startTime,
      endTime,
      notes: notes || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bookings"] }); onClose(); },
  });

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-xl bg-[#1B5E20] flex items-center justify-center text-xl">
              🏠
            </div>
            <div>
              <DialogTitle>Book {facility.name}</DialogTitle>
              <p className="text-xs text-[#6B5D45] mt-0.5">{facility.description}</p>
            </div>
          </div>
        </DialogHeader>
        <div className="px-6 pb-2 space-y-3">
          <div className="tribal-card p-3 text-xs text-amber-800">
            ⏱️ Max booking: {facility.maxBookingHours} hours
            {facility.requiresApproval ? " · Requires admin approval" : " · Auto-approved"}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#212121] font-semibold">Start</Label>
              <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label className="text-[#212121] font-semibold">End</Label>
              <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          {mutation.isError && (
            <p className="text-sm text-[#B71C1C]">{(mutation.error as Error).message}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!startTime || !endTime}
          >
            Book
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddFacilityDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [requiresApproval, setRequiresApproval] = useState("false");
  const [maxHours, setMaxHours] = useState("4");

  const mutation = useMutation({
    mutationFn: () => api.post("/api/facilities", {
      name,
      description: description || undefined,
      requiresApproval: requiresApproval === "true",
      maxBookingHours: Number(maxHours),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["facilities"] }); onClose(); },
  });

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-xl bg-[#1B5E20] flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <DialogTitle>Add Facility</DialogTitle>
          </div>
        </DialogHeader>
        <div className="px-6 pb-2 space-y-3">
          <div>
            <Label className="text-[#212121] font-semibold">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Clubhouse, Pool"
              error={name.length > 0 && name.trim().length < 2 ? "At least 2 characters" : undefined}
            />
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Requires approval?</Label>
            <Select value={requiresApproval} onValueChange={setRequiresApproval}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Auto-approved</SelectItem>
                <SelectItem value="true">Requires admin approval</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Max booking hours</Label>
            <Input type="number" min={1} max={24} value={maxHours} onChange={(e) => setMaxHours(e.target.value)} />
          </div>
          {mutation.isError && (
            <p className="text-sm text-[#B71C1C]">{(mutation.error as Error).message}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={name.trim().length < 2}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function BookingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === "admin";
  const [bookFacility, setBookFacility] = useState<Facility | null>(null);
  const [addFacility, setAddFacility] = useState(false);

  const { data: facilities, isLoading: loadFac } = useQuery({
    queryKey: ["facilities"],
    queryFn: () => api.get<Facility[]>("/api/facilities").then((r) => r.data),
  });

  const { data: bookings, isLoading: loadBk } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => api.get<Booking[]>("/api/facilities/bookings").then((r) => r.data),
  });

  const [bookingActionError, setBookingActionError] = useState<string | null>(null);
  const [confirmBooking, setConfirmBooking] = useState<{ id: string; status: "cancelled" | "rejected" } | null>(null);
  const updateBooking = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/facilities/bookings/${id}`, { status }),
    onSuccess: () => {
      setBookingActionError(null);
      setConfirmBooking(null);
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (err) => {
      setBookingActionError(err instanceof ApiError ? err.message : "Failed to update booking. Please try again.");
    },
  });

  return (
    <div className="page-wrap" data-bottomnav="true">
      <TopBar title="Facilities" />
      <main className="container-list pt-4 page-content">
        {bookingActionError && (
          <p className="text-xs text-[#B71C1C] font-medium mb-3">{bookingActionError}</p>
        )}
        <Tabs defaultValue="facilities">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="facilities" className="flex-1">Facilities</TabsTrigger>
            <TabsTrigger value="bookings" className="flex-1">My Bookings</TabsTrigger>
            {isAdmin && <TabsTrigger value="all" className="flex-1">All</TabsTrigger>}
          </TabsList>

          {/* Facilities */}
          <TabsContent value="facilities">
            <div className="flex justify-between items-center mb-3">
              <p className="section-label">Available Facilities</p>
              {isAdmin && (
                <Button size="sm" onClick={() => setAddFacility(true)} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Add
                </Button>
              )}
            </div>
            {loadFac ? <SectionLoader /> : !facilities?.length ? (
              <div className="tribal-card p-12 text-center">
                <BookOpen className="h-8 w-8 text-[#D4C9A8] mx-auto mb-2" />
                <p className="text-[#6B5D45] text-sm">No facilities yet.</p>
              </div>
            ) : (
              <div className="card-grid">
                {facilities.map((f) => (
                  <Card key={f.id}>
                    <CardContent className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-sm text-[#212121]">{f.name}</p>
                        {f.description && <p className="text-xs text-[#6B5D45]">{f.description}</p>}
                        <p className="text-xs text-[#D4C9A8] mt-0.5">
                          Max: {f.maxBookingHours}h · {f.requiresApproval ? "Requires approval" : "Auto-approved"}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => setBookFacility(f)}>Book</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* My bookings */}
          <TabsContent value="bookings">
            {loadBk ? <SectionLoader /> : !bookings?.length ? (
              <div className="tribal-card p-10 text-center">
                <CheckCircle className="h-12 w-12 text-[#D4C9A8] mx-auto mb-3" />
                <p className="font-semibold text-[#212121] mb-1">No bookings yet</p>
                <p className="text-[#6B5D45] text-sm">Book a facility from the tab above to see it here.</p>
              </div>
            ) : (
              <div className="card-grid">
                {bookings.map((b) => (
                  <Card key={b.id}>
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5">
                            {STATUS_ICON[b.status as keyof typeof STATUS_ICON] ?? <Clock className="h-4 w-4 text-[#6B5D45]" />}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-[#212121]">{b.facilityName}</p>
                            <p className="text-xs text-[#6B5D45]">
                              {formatDateTime(b.startTime)} → {formatDateTime(b.endTime)}
                            </p>
                            {b.notes && <p className="text-xs text-[#6B5D45] mt-0.5">{b.notes}</p>}
                          </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <Badge variant={STATUS_VARIANT[b.status] ?? "default"}>
                            {STATUS_LABEL[b.status] ?? b.status}
                          </Badge>
                          {b.status === "pending" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-[#B71C1C] h-6 text-xs px-2"
                              onClick={() => setConfirmBooking({ id: b.id, status: "cancelled" })}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Admin: all bookings */}
          {isAdmin && (
            <TabsContent value="all">
              {loadBk ? <SectionLoader /> : !bookings?.length ? (
                <div className="tribal-card p-10 text-center">
                  <p className="text-[#6B5D45] text-sm">No bookings.</p>
                </div>
              ) : (
                <div className="card-grid">
                  {bookings.map((b) => (
                    <Card key={b.id}>
                      <CardContent className="py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm text-[#212121]">{b.facilityName}</p>
                            <p className="text-xs text-[#6B5D45]">
                              {b.userName} · {formatDateTime(b.startTime)}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Badge variant={STATUS_VARIANT[b.status] ?? "default"}>
                              {STATUS_LABEL[b.status] ?? b.status}
                            </Badge>
                            {b.status === "pending" && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  className="h-6 text-xs px-2"
                                  onClick={() => updateBooking.mutate({ id: b.id, status: "approved" })}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-6 text-xs px-2"
                                  onClick={() => setConfirmBooking({ id: b.id, status: "rejected" })}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </main>

      {bookFacility && <BookDialog facility={bookFacility} onClose={() => setBookFacility(null)} />}
      {addFacility && <AddFacilityDialog onClose={() => setAddFacility(false)} />}
      <ConfirmDialog
        open={!!confirmBooking}
        onOpenChange={(v) => { if (!v) setConfirmBooking(null); }}
        title={confirmBooking?.status === "rejected" ? "Reject this booking?" : "Cancel this booking?"}
        description={
          confirmBooking?.status === "rejected"
            ? "The resident will be notified their booking was rejected."
            : "This booking will be cancelled."
        }
        confirmLabel={confirmBooking?.status === "rejected" ? "Reject" : "Cancel Booking"}
        cancelLabel="Keep it"
        loading={updateBooking.isPending}
        onConfirm={() => confirmBooking && updateBooking.mutate(confirmBooking)}
      />
      <BottomNav />
    </div>
  );
}
