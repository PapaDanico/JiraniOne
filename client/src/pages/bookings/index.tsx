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
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { Facility, Booking } from "@shared/types";

const statusIcon = {
  approved: <CheckCircle className="h-4 w-4 text-green-500" />,
  pending: <Clock className="h-4 w-4 text-amber-500" />,
  rejected: <XCircle className="h-4 w-4 text-red-400" />,
  cancelled: <XCircle className="h-4 w-4 text-gray-400" />,
  completed: <CheckCircle className="h-4 w-4 text-gray-400" />,
};

const statusVariant: Record<string, "success" | "warning" | "destructive" | "default"> = {
  approved: "success",
  pending: "warning",
  rejected: "destructive",
  cancelled: "default",
  completed: "default",
};

function BookDialog({ facility, onClose }: { facility: Facility; onClose: () => void }) {
  const qc = useQueryClient();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.post("/api/facilities/bookings", {
      facilityId: facility.id,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      notes: notes || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bookings"] }); onClose(); },
  });

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Book {facility.name}</DialogTitle></DialogHeader>
        <div className="px-6 pb-2 space-y-3">
          {facility.description && (
            <p className="text-sm text-gray-500">{facility.description}</p>
          )}
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            Max {facility.maxBookingHours}h per booking
            {facility.requiresApproval ? " · Requires admin approval" : " · Auto-approved"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start</Label><Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
            <div><Label>End</Label><Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
          </div>
          <div><Label>Notes (optional)</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
          {mutation.isError && (
            <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!startTime || !endTime}
          >Book</Button>
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
        <DialogHeader><DialogTitle>Add Facility</DialogTitle></DialogHeader>
        <div className="px-6 pb-2 space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Clubhouse, Swimming Pool" /></div>
          <div><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div>
            <Label>Requires approval?</Label>
            <Select value={requiresApproval} onValueChange={setRequiresApproval}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Auto-approve</SelectItem>
                <SelectItem value="true">Requires admin approval</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Max hours per booking</Label><Input type="number" min={1} max={24} value={maxHours} onChange={(e) => setMaxHours(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!name}>Add</Button>
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

  const updateBooking = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/facilities/bookings/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });

  return (
    <div className="min-h-screen bg-white pb-20">
      <TopBar title="Bookings" />
      <main className="max-w-lg mx-auto px-4 pt-4">
        <Tabs defaultValue="facilities">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="facilities" className="flex-1">Facilities</TabsTrigger>
            <TabsTrigger value="bookings" className="flex-1">My Bookings</TabsTrigger>
            {isAdmin && <TabsTrigger value="all" className="flex-1">All</TabsTrigger>}
          </TabsList>

          {/* Facilities tab */}
          <TabsContent value="facilities">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-sm text-gray-700">Available Facilities</h2>
              {isAdmin && (
                <Button size="sm" onClick={() => setAddFacility(true)}>
                  <Plus className="h-4 w-4" /> Add
                </Button>
              )}
            </div>
            {loadFac ? <SectionLoader /> : !facilities?.length ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No facilities added yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {facilities.map((f) => (
                  <Card key={f.id}>
                    <CardContent className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{f.name}</p>
                        {f.description && <p className="text-xs text-gray-500">{f.description}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">
                          Max {f.maxBookingHours}h · {f.requiresApproval ? "Approval required" : "Auto-approve"}
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
              <p className="text-center text-gray-400 text-sm py-12">No bookings yet.</p>
            ) : (
              <div className="space-y-2">
                {bookings.map((b) => (
                  <Card key={b.id}>
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          {statusIcon[b.status] ?? <Clock className="h-4 w-4 text-gray-400" />}
                          <div>
                            <p className="font-medium text-sm text-gray-900">{b.facilityName}</p>
                            <p className="text-xs text-gray-500">{formatDateTime(b.startTime)} → {formatDateTime(b.endTime)}</p>
                            {b.notes && <p className="text-xs text-gray-400 mt-0.5">{b.notes}</p>}
                          </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <Badge variant={statusVariant[b.status] ?? "default"}>{b.status}</Badge>
                          {b.status === "pending" && (
                            <Button size="sm" variant="ghost" className="text-red-500 h-6 text-xs px-2"
                              onClick={() => updateBooking.mutate({ id: b.id, status: "cancelled" })}>
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
                <p className="text-center text-gray-400 text-sm py-12">No bookings.</p>
              ) : (
                <div className="space-y-2">
                  {bookings.map((b) => (
                    <Card key={b.id}>
                      <CardContent className="py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm text-gray-900">{b.facilityName}</p>
                            <p className="text-xs text-gray-500">{b.userName} · {formatDateTime(b.startTime)}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant={statusVariant[b.status] ?? "default"}>{b.status}</Badge>
                            {b.status === "pending" && (
                              <div className="flex gap-1">
                                <Button size="sm" className="h-6 text-xs px-2"
                                  onClick={() => updateBooking.mutate({ id: b.id, status: "approved" })}>
                                  Approve
                                </Button>
                                <Button size="sm" variant="secondary" className="h-6 text-xs px-2"
                                  onClick={() => updateBooking.mutate({ id: b.id, status: "rejected" })}>
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
      <BottomNav />
    </div>
  );
}
