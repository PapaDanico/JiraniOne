import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Store, Phone, Plus, Star, BadgeCheck, Search, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PROVIDER_CATEGORIES,
  RATE_CARDS,
  AVAILABILITY_OPTIONS,
  EXPERIENCE_OPTIONS,
  SPECIALIZATIONS,
  MAX_SPECIALIZATIONS,
  experienceLabel,
  availabilityLabel,
} from "@shared/marketplace";
import { SectionLoader } from "@/components/shared/loading";
import { api, ApiError } from "@/lib/api";
import { displayPhone, formatRelative } from "@/lib/utils";
import type { ServiceProvider, ServiceReview } from "@shared/types";

const CAT_MAP = Object.fromEntries(PROVIDER_CATEGORIES.map((c) => [c.value, c]));

function AddProviderDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", category: "", phone: "", description: "" });
  const [experience, setExperience] = useState<string>("");
  const [rateCard, setRateCard] = useState<string>("");
  const [availability, setAvailability] = useState<string>("");
  const [specs, setSpecs] = useState<string[]>([]);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const toggleSpec = (sp: string) =>
    setSpecs((cur) =>
      cur.includes(sp) ? cur.filter((x) => x !== sp) : cur.length < MAX_SPECIALIZATIONS ? [...cur, sp] : cur,
    );
  const specOptions = SPECIALIZATIONS[form.category] ?? [];

  const mutation = useMutation({
    mutationFn: () => api.post("/api/services", {
      ...form,
      description: form.description || undefined,
      experienceYears: experience ? Number(experience) : undefined,
      rateCard: rateCard || undefined,
      availability: availability || undefined,
      specializations: specs.length ? specs : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services"] }); onClose(); },
  });

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-xl bg-[#D47A00]/10 flex items-center justify-center text-xl">
              🏪
            </div>
            <DialogTitle>Add Service Provider</DialogTitle>
          </div>
        </DialogHeader>
        <div className="px-6 pb-2 space-y-3">
          <div>
            <Label className="text-[#212121] font-semibold">Name</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Full name"
              error={form.name.length > 0 && form.name.trim().length < 2 ? "At least 2 characters" : undefined}
            />
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Service Type</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {PROVIDER_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => { set("category", c.value); setSpecs([]); }}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    form.category === c.value
                      ? "bg-[#1B5E20] text-white border-[#1B5E20]"
                      : "border-[#D4C9A8] text-[#6B5D45] hover:border-[#1B5E20]/40"
                  }`}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Phone</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="07XXXXXXXX" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#212121] font-semibold">Experience</Label>
              <Select value={experience} onValueChange={setExperience}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#212121] font-semibold">Rate card</Label>
              <Select value={rateCard} onValueChange={setRateCard}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {RATE_CARDS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Availability</Label>
            <Select value={availability} onValueChange={setAvailability}>
              <SelectTrigger><SelectValue placeholder="When can customers reach them?" /></SelectTrigger>
              <SelectContent>
                {AVAILABILITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {specOptions.length > 0 && (
            <div>
              <Label className="text-[#212121] font-semibold">
                Specialisations <span className="font-normal text-xs text-[#6B5D45]">(up to {MAX_SPECIALIZATIONS})</span>
              </Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {specOptions.map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => toggleSpec(sp)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      specs.includes(sp)
                        ? "bg-[#D47A00] text-white border-[#D47A00]"
                        : "border-[#D4C9A8] text-[#6B5D45] hover:border-[#D47A00]/40"
                    }`}
                  >
                    {sp}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <Label className="text-[#212121] font-semibold">Anything else <span className="font-normal text-xs text-[#6B5D45]">(optional)</span></Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder="e.g. serves nearby estates too, has own tools & transport"
            />
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
            disabled={!form.name || !form.category || !form.phone}
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} className="p-0.5">
          <Star
            className={`h-7 w-7 transition-colors ${
              n <= value ? "text-[#D4A017] fill-[#D4A017]" : "text-[#D4C9A8]"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function RateProviderDialog({ provider, onClose }: { provider: ServiceProvider; onClose: () => void }) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.post(`/api/services/${provider.id}/reviews`, { rating, comment: comment || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      qc.invalidateQueries({ queryKey: ["services", provider.id, "reviews"] });
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate {provider.name}</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-2 space-y-4">
          <div>
            <Label className="text-[#212121] font-semibold">Your rating</Label>
            <div className="mt-1"><StarPicker value={rating} onChange={setRating} /></div>
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Comment (optional)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="How was your experience?"
            />
          </div>
          {mutation.isError && (
            <p className="text-sm text-[#B71C1C]">{(mutation.error as Error).message}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={rating === 0}>
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewsList({ providerId }: { providerId: string }) {
  const { data, isLoading } = useQuery<ServiceReview[]>({
    queryKey: ["services", providerId, "reviews"],
    queryFn: () => api.get<ServiceReview[]>(`/api/services/${providerId}/reviews`).then((r) => r.data),
  });

  if (isLoading) return <p className="text-xs text-[#6B5D45]/60">Loading…</p>;
  if (!data?.length) return <p className="text-xs text-[#6B5D45]/60">No reviews yet.</p>;

  return (
    <div className="space-y-2 max-h-56 overflow-y-auto rounded-lg bg-[#1B5E20]/5 p-2.5">
      {data.map((r) => (
        <div key={r.id} className="text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#212121] font-medium">
              {r.reviewer?.name ?? "Resident"}
              {r.reviewer?.unitNumber && <span className="text-[#6B5D45]/60"> · {r.reviewer.unitNumber}</span>}
            </span>
            <span className="flex items-center gap-1 text-[#D4A017]">
              <Star className="h-3 w-3 fill-[#D4A017]" /> {r.rating}
            </span>
          </div>
          {r.comment && <p className="text-[#6B5D45] mt-0.5">{r.comment}</p>}
          <p className="text-[#6B5D45]/60 mt-0.5">{formatRelative(r.createdAt)}</p>
        </div>
      ))}
    </div>
  );
}

export default function MarketplacePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [rateTarget, setRateTarget] = useState<ServiceProvider | null>(null);
  const [expandedReviews, setExpandedReviews] = useState<string | null>(null);
  const canAdd = user?.role === "admin" || user?.role === "vendor";

  const { data: providers, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => api.get<ServiceProvider[]>("/api/services").then((r) => r.data),
  });

  const [verifyError, setVerifyError] = useState<string | null>(null);
  const verify = useMutation({
    mutationFn: (id: string) => api.patch(`/api/services/${id}`, { verified: true }),
    onSuccess: () => { setVerifyError(null); qc.invalidateQueries({ queryKey: ["services"] }); },
    onError: (err) => {
      setVerifyError(err instanceof ApiError ? err.message : "Failed to verify provider. Please try again.");
    },
  });

  const filtered = providers?.filter((p) =>
    !filter ||
    p.name.toLowerCase().includes(filter.toLowerCase()) ||
    p.category.toLowerCase().includes(filter.toLowerCase()),
  ) ?? [];

  const grouped = filtered.reduce<Record<string, ServiceProvider[]>>((acc, p) => {
    (acc[p.category] = acc[p.category] ?? []).push(p);
    return acc;
  }, {});

  return (
    <div className="page-wrap" data-bottomnav="true">
      <TopBar title="Marketplace" />
      <main className="container-list pt-4 space-y-4 page-content">
        {verifyError && (
          <p className="text-xs text-[#B71C1C] font-medium">{verifyError}</p>
        )}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B5D45]" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search by name or type..."
              className="pl-9"
            />
          </div>
          {canAdd && (
            <Button onClick={() => setAddOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        {isLoading ? (
          <SectionLoader />
        ) : !filtered.length ? (
          <div className="tribal-card p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#D47A00]/10 flex items-center justify-center mx-auto mb-3">
              <Store className="h-7 w-7 text-[#D47A00]" />
            </div>
            <p className="font-semibold text-[#212121] mb-1">
              {filter ? "No results found" : "No service providers yet"}
            </p>
            <p className="text-[#6B5D45] text-sm">
              {filter ? "Try a different search term" : "Service providers will appear here"}
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => {
            const catCfg = CAT_MAP[cat];
            return (
              <section key={cat}>
                <p className="section-label mb-2">
                  {catCfg ? `${catCfg.emoji} ${catCfg.label}` : cat}
                </p>
                <div className="card-grid">
                  {items.map((p) => (
                    <Card key={p.id}>
                      <CardContent className="py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-sm text-[#212121]">{p.name}</p>
                              {p.verified && (
                                <BadgeCheck className="h-4 w-4 text-[#1B5E20]" aria-label="Verified" />
                              )}
                            </div>
                            {(p.experienceYears || p.rateCard || p.availability) && (
                              <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-[#6B5D45]">
                                {p.experienceYears != null && p.experienceYears > 0 && (
                                  <span className="bg-[#1B5E20]/8 rounded-full px-2 py-0.5">💼 {experienceLabel(p.experienceYears)}</span>
                                )}
                                {p.rateCard && (
                                  <span className="bg-[#D4A017]/12 rounded-full px-2 py-0.5">💰 {p.rateCard}</span>
                                )}
                                {p.availability && (
                                  <span className="bg-[#D47A00]/10 rounded-full px-2 py-0.5">🕒 {availabilityLabel(p.availability)}</span>
                                )}
                              </div>
                            )}
                            {(p.specializations?.length ?? 0) > 0 && (
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {p.specializations!.map((sp) => (
                                  <span key={sp} className="text-[11px] text-[#6B5D45] border border-[#D4C9A8] rounded-full px-2 py-0.5">{sp}</span>
                                ))}
                              </div>
                            )}
                            {p.description && (
                              <p className="text-xs text-[#6B5D45] mt-0.5">{p.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              {p.ratingCount > 0 && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-3.5 w-3.5 text-[#D4A017] fill-[#D4A017]" />
                                  <span className="text-xs text-[#6B5D45]">
                                    {Number(p.rating ?? 0).toFixed(1)} ({p.ratingCount})
                                  </span>
                                </div>
                              )}
                              {p.ratingCount > 0 && (
                                <button
                                  onClick={() => setExpandedReviews(expandedReviews === p.id ? null : p.id)}
                                  className="flex items-center gap-1 text-xs text-[#1B5E20] font-semibold hover:underline"
                                >
                                  <MessageSquare className="h-3 w-3" />
                                  {expandedReviews === p.id ? "Hide reviews" : "See reviews"}
                                </button>
                              )}
                              {user?.role === "resident" && (
                                <button
                                  onClick={() => setRateTarget(p)}
                                  className="flex items-center gap-1 text-xs text-[#D47A00] font-semibold hover:underline"
                                >
                                  <Star className="h-3 w-3" /> Rate
                                </button>
                              )}
                            </div>
                            {expandedReviews === p.id && (
                              <div className="mt-2"><ReviewsList providerId={p.id} /></div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <a
                              href={`tel:${p.phone}`}
                              className="flex items-center gap-1.5 text-sm font-bold text-[#1B5E20] bg-[#1B5E20]/8 rounded-xl px-3 py-1.5"
                            >
                              <Phone className="h-3.5 w-3.5" />
                              {displayPhone(p.phone)}
                            </a>
                            {user?.role === "admin" && !p.verified && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-6 text-xs px-2"
                                onClick={() => verify.mutate(p.id)}
                              >
                                Verify
                              </Button>
                            )}
                          </div>
                        </div>
                        {!p.verified && (
                          <div className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-1.5 border border-amber-200">
                            ⏳ Pending verification
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </main>

      {addOpen && <AddProviderDialog onClose={() => setAddOpen(false)} />}
      {rateTarget && <RateProviderDialog provider={rateTarget} onClose={() => setRateTarget(null)} />}
      <BottomNav />
    </div>
  );
}
