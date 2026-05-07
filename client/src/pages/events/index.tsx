import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MapPin, Users, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SectionLoader } from "@/components/shared/loading";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { Event } from "@shared/types";

function CreateEventDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: "", description: "", location: "", startTime: "", endTime: "",
  });

  const mutation = useMutation({
    mutationFn: () => api.post("/api/events", {
      ...form,
      startTime: new Date(form.startTime).toISOString(),
      endTime: new Date(form.endTime).toISOString(),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); onClose(); },
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Event</DialogTitle></DialogHeader>
        <div className="px-6 pb-2 space-y-3">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Event title" /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} /></div>
          <div><Label>Location</Label><Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Clubhouse" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start</Label><Input type="datetime-local" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} /></div>
            <div><Label>End</Label><Input type="datetime-local" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!form.title || !form.startTime || !form.endTime}
          >Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function EventsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => api.get<Event[]>("/api/events").then((r) => r.data),
  });

  const rsvp = useMutation({
    mutationFn: ({ id, attending }: { id: string; attending: boolean }) =>
      api.post(`/api/events/${id}/rsvp`, { attending }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });

  return (
    <div className="min-h-screen bg-white pb-20">
      <TopBar title="Events" />
      <main className="max-w-lg mx-auto px-4 pt-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-semibold text-gray-900">Upcoming Events</h1>
          {user?.role === "admin" && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          )}
        </div>

        {isLoading ? (
          <SectionLoader />
        ) : !events?.length ? (
          <div className="text-center py-16">
            <CalendarDays className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No upcoming events.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((e) => (
              <Card key={e.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900">{e.title}</p>
                      {e.description && (
                        <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{e.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDateTime(e.startTime)}
                        </span>
                        {e.location && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="h-3.5 w-3.5" /> {e.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Users className="h-3.5 w-3.5" /> {e.rsvpCount ?? 0} going
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {e.myRsvp ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => rsvp.mutate({ id: e.id, attending: false })}
                        >Going ✓</Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => rsvp.mutate({ id: e.id, attending: true })}
                        >RSVP</Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {createOpen && <CreateEventDialog onClose={() => setCreateOpen(false)} />}
      <BottomNav />
    </div>
  );
}
