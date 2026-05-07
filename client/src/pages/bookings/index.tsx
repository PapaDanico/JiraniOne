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
  approved: "Imeidhinishwa", pending: "Inasubiri",
  rejected: "Imekataliwa", cancelled: "Imesitishwa", completed: "Imekamilika",
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
        <DialogHeader>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-xl bg-[#1B5E20] flex items-center justify-center text-xl">
              🏠
            </div>
            <div>
              <DialogTitle>Hifadhi {facility.name}</DialogTitle>
              <p className="text-xs text-[#6B5D45] mt-0.5">{facility.description}</p>
            </div>
          </div>
        </DialogHeader>
        <div className="px-6 pb-2 space-y-3">
          <div className="tribal-card p-3 text-xs text-amber-800">
            ⏱️ Kiwango cha juu: masaa {facility.maxBookingHours}
            {facility.requiresApproval ? " · Inahitaji idhini ya msimamizi" : " · Inaidhinishwa moja kwa moja"}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#212121] font-semibold">Mwanzo</Label>
              <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label className="text-[#212121] font-semibold">Mwisho</Label>
              <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Maelezo (si lazima)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          {mutation.isError && (
            <p className="text-sm text-[#B71C1C]">{(mutation.error as Error).message}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Ghairi</Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!startTime || !endTime}
          >
            Hifadhi
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
            <DialogTitle>Ongeza Eneo</DialogTitle>
          </div>
        </DialogHeader>
        <div className="px-6 pb-2 space-y-3">
          <div>
            <Label className="text-[#212121] font-semibold">Jina</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="mfano: Clubhouse, Pool" />
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Maelezo</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Idhini inahitajika?</Label>
            <Select value={requiresApproval} onValueChange={setRequiresApproval}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Inaidhinishwa moja kwa moja</SelectItem>
                <SelectItem value="true">Inahitaji idhini ya msimamizi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Masaa ya juu kwa hifadhi</Label>
            <Input type="number" min={1} max={24} value={maxHours} onChange={(e) => setMaxHours(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Ghairi</Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!name}>Ongeza</Button>
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
    <div className="page-wrap">
      <TopBar title="Maeneo" />
      <main className="max-w-lg mx-auto px-4 pt-4 page-content">
        <Tabs defaultValue="facilities">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="facilities" className="flex-1">Maeneo</TabsTrigger>
            <TabsTrigger value="bookings" className="flex-1">Hifadhi Zangu</TabsTrigger>
            {isAdmin && <TabsTrigger value="all" className="flex-1">Zote</TabsTrigger>}
          </TabsList>

          {/* Facilities */}
          <TabsContent value="facilities">
            <div className="flex justify-between items-center mb-3">
              <p className="section-label">Maeneo Yanayopatikana</p>
              {isAdmin && (
                <Button size="sm" onClick={() => setAddFacility(true)} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Ongeza
                </Button>
              )}
            </div>
            {loadFac ? <SectionLoader /> : !facilities?.length ? (
              <div className="tribal-card p-12 text-center">
                <BookOpen className="h-8 w-8 text-[#D4C9A8] mx-auto mb-2" />
                <p className="text-[#6B5D45] text-sm">Hakuna maeneo bado.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {facilities.map((f) => (
                  <Card key={f.id}>
                    <CardContent className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-sm text-[#212121]">{f.name}</p>
                        {f.description && <p className="text-xs text-[#6B5D45]">{f.description}</p>}
                        <p className="text-xs text-[#D4C9A8] mt-0.5">
                          Kiwango: masaa {f.maxBookingHours} · {f.requiresApproval ? "Inahitaji idhini" : "Moja kwa moja"}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => setBookFacility(f)}>Hifadhi</Button>
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
                <p className="text-[#6B5D45] text-sm">Hakuna hifadhi bado.</p>
              </div>
            ) : (
              <div className="space-y-2">
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
                              onClick={() => updateBooking.mutate({ id: b.id, status: "cancelled" })}
                            >
                              Sitisha
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
                  <p className="text-[#6B5D45] text-sm">Hakuna hifadhi.</p>
                </div>
              ) : (
                <div className="space-y-2">
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
                                  Idhinisha
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-6 text-xs px-2"
                                  onClick={() => updateBooking.mutate({ id: b.id, status: "rejected" })}
                                >
                                  Kataa
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
