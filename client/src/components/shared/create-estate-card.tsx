import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api, ApiError } from "@/lib/api";
import { BRAND_NAME } from "@shared/brand";

// The self-serve "inquiry → trial estate" path. Shown on the resident
// dashboard only when the account has no estate: the user either joins an
// existing estate (nav menu prompt) or starts their own here and becomes
// its admin — no manual DB rows needed to onboard a new estate.
export function CreateEstateCard() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", location: "", totalUnits: "" });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/api/estates", {
        name: form.name.trim(),
        location: form.location.trim(),
        ...(form.totalUnits ? { totalUnits: Number(form.totalUnits) } : {}),
      }),
    onSuccess: () => {
      // Role changed to admin server-side — refetch auth so routing and
      // nav pick up the new role, then land on the admin dashboard.
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      qc.invalidateQueries({ queryKey: ["estate"] });
      window.location.href = "/dashboard/admin";
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Failed to create estate."),
  });

  return (
    <>
      <div className="tribal-card p-5 border-2 border-dashed border-brand-green/40">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-brand-green" />
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-sm text-tribal-charcoal">
              Run an estate? Set it up on {BRAND_NAME}
            </p>
            <p className="text-xs text-tribal-earth mt-1">
              Create your estate in under a minute — you'll become its admin
              and can invite residents right away.
            </p>
            <Button size="sm" className="mt-3" onClick={() => setOpen(true)}>
              Create your estate
            </Button>
          </div>
        </div>
      </div>

      {open && (
        <Dialog open onOpenChange={(v) => { if (!v) setOpen(false); }}>
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center gap-3 mt-2">
                <div className="w-10 h-10 rounded-xl bg-brand-green flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <DialogTitle>Create your estate</DialogTitle>
              </div>
            </DialogHeader>
            <div className="px-6 pb-2 space-y-3">
              <div>
                <Label className="font-semibold">Estate name</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Fanaka Gardens" />
              </div>
              <div>
                <Label className="font-semibold">Location</Label>
                <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Ruiru, Kiambu" />
              </div>
              <div>
                <Label className="font-semibold">Number of units (optional)</Label>
                <Input type="number" min={1} value={form.totalUnits} onChange={(e) => set("totalUnits", e.target.value)} />
              </div>
              {error && <p className="text-sm text-brand-red bg-brand-red/10 rounded-xl px-3 py-2">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                onClick={() => mutation.mutate()}
                loading={mutation.isPending}
                disabled={form.name.trim().length < 3 || form.location.trim().length < 2}
              >
                Create estate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
