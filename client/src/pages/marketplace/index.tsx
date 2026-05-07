import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Store, Phone, Plus, Star, BadgeCheck, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SectionLoader } from "@/components/shared/loading";
import { api } from "@/lib/api";
import { displayPhone } from "@/lib/utils";
import type { ServiceProvider } from "@shared/types";

const CATEGORIES = [
  { value: "Plumber",        emoji: "🔧", swahili: "Fundi bomba" },
  { value: "Electrician",    emoji: "⚡", swahili: "Fundi umeme" },
  { value: "Cleaner",        emoji: "🧹", swahili: "Msafi" },
  { value: "Painter",        emoji: "🎨", swahili: "Mpakaji" },
  { value: "Carpenter",      emoji: "🪚", swahili: "Seremala" },
  { value: "Security Guard", emoji: "🛡️", swahili: "Askari" },
  { value: "Gardener",       emoji: "🌿", swahili: "Mtunza bustani" },
  { value: "Handyman",       emoji: "🛠️", swahili: "Fundi wa kila aina" },
  { value: "Driver",         emoji: "🚗", swahili: "Dereva" },
  { value: "Tutor",          emoji: "📚", swahili: "Mwalimu" },
  { value: "Other",          emoji: "📋", swahili: "Nyingine" },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

function AddProviderDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", category: "", phone: "", description: "" });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => api.post("/api/services", {
      ...form,
      description: form.description || undefined,
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
            <DialogTitle>Ongeza Mtoa Huduma</DialogTitle>
          </div>
        </DialogHeader>
        <div className="px-6 pb-2 space-y-3">
          <div>
            <Label className="text-[#212121] font-semibold">Jina</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Jina kamili" />
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Aina ya Huduma</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => set("category", c.value)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    form.category === c.value
                      ? "bg-[#1B5E20] text-white border-[#1B5E20]"
                      : "border-[#D4C9A8] text-[#6B5D45] hover:border-[#1B5E20]/40"
                  }`}
                >
                  {c.emoji} {c.swahili}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Simu</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="07XXXXXXXX" />
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Maelezo</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder="Uzoefu, viwango, huduma maalum..."
            />
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
            disabled={!form.name || !form.category || !form.phone}
          >
            Ongeza
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MarketplacePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const canAdd = user?.role === "admin" || user?.role === "vendor";

  const { data: providers, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => api.get<ServiceProvider[]>("/api/services").then((r) => r.data),
  });

  const verify = useMutation({
    mutationFn: (id: string) => api.patch(`/api/services/${id}`, { verified: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["services"] }),
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
    <div className="page-wrap">
      <TopBar title="Soko" />
      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4 page-content">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B5D45]" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Tafuta jina au aina..."
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
              {filter ? "Hakuna matokeo" : "Hakuna watoa huduma"}
            </p>
            <p className="text-[#6B5D45] text-sm">
              {filter ? "Jaribu neno tofauti" : "Watoa huduma wataonekana hapa"}
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => {
            const catCfg = CAT_MAP[cat];
            return (
              <section key={cat}>
                <p className="section-label mb-2">
                  {catCfg ? `${catCfg.emoji} ${catCfg.swahili}` : cat}
                </p>
                <div className="space-y-2">
                  {items.map((p) => (
                    <Card key={p.id}>
                      <CardContent className="py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-sm text-[#212121]">{p.name}</p>
                              {p.verified && (
                                <BadgeCheck className="h-4 w-4 text-[#1B5E20]" aria-label="Amethibitishwa" />
                              )}
                            </div>
                            {p.description && (
                              <p className="text-xs text-[#6B5D45] mt-0.5">{p.description}</p>
                            )}
                            {p.ratingCount > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                <Star className="h-3.5 w-3.5 text-[#D4A017] fill-[#D4A017]" />
                                <span className="text-xs text-[#6B5D45]">
                                  {Number(p.rating ?? 0).toFixed(1)} ({p.ratingCount})
                                </span>
                              </div>
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
                                Thibitisha
                              </Button>
                            )}
                          </div>
                        </div>
                        {!p.verified && (
                          <div className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-1.5 border border-amber-200">
                            ⏳ Inasubiri uthibitisho
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
      <BottomNav />
    </div>
  );
}
