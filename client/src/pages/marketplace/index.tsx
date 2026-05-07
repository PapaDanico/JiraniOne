import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Store, Phone, Plus, Star, BadgeCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  "Plumber", "Electrician", "Cleaner", "Painter", "Carpenter",
  "Security Guard", "Gardener", "Handyman", "Driver", "Tutor", "Other",
];

const categoryColor: Record<string, string> = {
  Plumber: "bg-blue-50 text-blue-700",
  Electrician: "bg-yellow-50 text-yellow-700",
  Cleaner: "bg-green-50 text-green-700",
  Painter: "bg-purple-50 text-purple-700",
  Carpenter: "bg-amber-50 text-amber-700",
};

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
        <DialogHeader><DialogTitle>Add Service Provider</DialogTitle></DialogHeader>
        <div className="px-6 pb-2 space-y-3">
          <div><Label>Name</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Full name" /></div>
          <div>
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("category", c)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    form.category === c
                      ? "bg-[#1A5C38] text-white border-[#1A5C38]"
                      : "border-[#E8E6E3] text-gray-600 hover:border-[#1A5C38]/40"
                  }`}
                >{c}</button>
              ))}
            </div>
          </div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="07XXXXXXXX" /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} placeholder="Skills, experience, rates..." /></div>
          {mutation.isError && (
            <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!form.name || !form.category || !form.phone}
          >Add</Button>
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

  // Group by category
  const grouped = filtered.reduce<Record<string, ServiceProvider[]>>((acc, p) => {
    (acc[p.category] = acc[p.category] ?? []).push(p);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-white pb-20">
      <TopBar title="Marketplace" />
      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        <div className="flex gap-2">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search by name or category..."
            className="flex-1"
          />
          {canAdd && (
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        {isLoading ? (
          <SectionLoader />
        ) : !filtered.length ? (
          <div className="text-center py-16">
            <Store className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">
              {filter ? "No results found." : "No service providers listed yet."}
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <section key={cat}>
              <h2 className="font-semibold text-sm text-gray-700 mb-2">{cat}</h2>
              <div className="space-y-2">
                {items.map((p) => (
                  <Card key={p.id}>
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-gray-900">{p.name}</p>
                            {p.verified && (
                              <BadgeCheck className="h-4 w-4 text-[#1A5C38]" aria-label="Verified" />
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColor[cat] ?? "bg-gray-100 text-gray-600"}`}>
                              {cat}
                            </span>
                          </div>
                          {p.description && (
                            <p className="text-xs text-gray-500 mt-1">{p.description}</p>
                          )}
                          {p.ratingCount > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                              <span className="text-xs text-gray-600">{Number(p.rating ?? 0).toFixed(1)} ({p.ratingCount})</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <a
                            href={`tel:${p.phone}`}
                            className="flex items-center gap-1.5 text-sm font-medium text-[#1A5C38]"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {displayPhone(p.phone)}
                          </a>
                          {user?.role === "admin" && !p.verified && (
                            <Button size="sm" variant="secondary" className="h-6 text-xs px-2"
                              onClick={() => verify.mutate(p.id)}>
                              Verify
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {addOpen && <AddProviderDialog onClose={() => setAddOpen(false)} />}
      <BottomNav />
    </div>
  );
}
