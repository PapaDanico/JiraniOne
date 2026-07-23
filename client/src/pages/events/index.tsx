import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MapPin, Users, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SectionLoader } from "@/components/shared/loading";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
import type { Event } from "@shared/types";
import { EVENT_TYPES, eventTypeCfg } from "@shared/options";

function CreateEventDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({
    title: "", description: "", location: "", startTime: "", endTime: "",
  });
  const [eventType, setEventType] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.post("/api/events", { ...form, eventType: eventType || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); toast("Event created — residents will see it on their calendar"); onClose(); },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Failed to create event. Please try again.");
    },
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-xl bg-[#1B5E20] flex items-center justify-center text-xl">
              🎉
            </div>
            <DialogTitle>Create Event</DialogTitle>
          </div>
        </DialogHeader>
        <div className="px-6 pb-2 space-y-3">
          <div>
            <Label className="text-[#212121] font-semibold">Event Type</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setEventType(eventType === t.value ? "" : t.value)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    eventType === t.value
                      ? "bg-[#1B5E20] text-white border-[#1B5E20]"
                      : "border-[#D4C9A8] text-[#6B5D45] hover:border-[#1B5E20]/40"
                  }`}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Event Name</Label>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Event title"
              error={form.title.length > 0 && form.title.trim().length < 3 ? "At least 3 characters" : undefined}
            />
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Description</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} />
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Location</Label>
            <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Clubhouse" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#212121] font-semibold">Start</Label>
              <Input type="datetime-local" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
            </div>
            <div>
              <Label className="text-[#212121] font-semibold">End</Label>
              <Input type="datetime-local" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
            </div>
          </div>
          {error && (
            <p className="text-sm text-[#B71C1C] bg-[#B71C1C]/8 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={form.title.trim().length < 3 || !form.startTime || !form.endTime}
          >
            Create
          </Button>
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

  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const rsvp = useMutation({
    mutationFn: ({ id, attending }: { id: string; attending: boolean }) =>
      api.post(`/api/events/${id}/rsvp`, { attending }),
    onSuccess: () => { setRsvpError(null); qc.invalidateQueries({ queryKey: ["events"] }); },
    onError: (err) => {
      setRsvpError(err instanceof ApiError ? err.message : "Failed to update your RSVP. Please try again.");
    },
  });

  return (
    <div className="page-wrap" data-bottomnav="true">
      <TopBar title="Events" />
      <main className="container-list pt-4 page-content">
        <div className="flex items-center justify-between mb-4">
          <p className="section-label">Estate Events</p>
          {user?.role === "admin" && (
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add
            </Button>
          )}
        </div>

        {rsvpError && (
          <p className="text-xs text-[#B71C1C] font-medium mb-3">{rsvpError}</p>
        )}

        {isLoading ? (
          <SectionLoader />
        ) : !events?.length ? (
          <div className="tribal-card p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#1B5E20]/10 flex items-center justify-center mx-auto mb-3">
              <CalendarDays className="h-7 w-7 text-[#1B5E20]" />
            </div>
            <p className="font-semibold text-[#212121] mb-1">No events yet</p>
            <p className="text-[#6B5D45] text-sm">Estate events will appear here</p>
          </div>
        ) : (
          <div className="card-grid">
            {events.map((e) => (
              <Card key={e.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-[#212121]">{e.title}</p>
                        {eventTypeCfg(e.eventType) && (
                          <span className="text-[11px] text-[#6B5D45] bg-[#1B5E20]/8 rounded-full px-2 py-0.5">
                            {eventTypeCfg(e.eventType)!.emoji} {eventTypeCfg(e.eventType)!.label}
                          </span>
                        )}
                      </div>
                      {e.description && (
                        <p className="text-sm text-[#6B5D45] mt-0.5 leading-relaxed">{e.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                        <span className="flex items-center gap-1 text-xs text-[#6B5D45]">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDateTime(e.startTime)}
                        </span>
                        {e.location && (
                          <span className="flex items-center gap-1 text-xs text-[#6B5D45]">
                            <MapPin className="h-3.5 w-3.5" /> {e.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-[#6B5D45]">
                          <Users className="h-3.5 w-3.5" /> {e.rsvpCount ?? 0} attending
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {e.myRsvp ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => rsvp.mutate({ id: e.id, attending: false })}
                        >
                          Attending ✓
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => rsvp.mutate({ id: e.id, attending: true })}
                        >
                          RSVP
                        </Button>
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
