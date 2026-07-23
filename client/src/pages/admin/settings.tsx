import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, CreditCard, Download, Save } from "lucide-react";
import { BillingCard } from "@/components/admin/billing-card";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { PageFooter } from "@/components/shared/page-footer";
import { SectionTitle } from "@/components/shared/section-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEstate } from "@/hooks/useEstate";
import { api, ApiError } from "@/lib/api";

// Estate-level settings — until this page existed, estate name/location/
// security phone could only be changed by direct SQL. The security phone
// is what the SOS page's one-tap "call security" dials, so an estate that
// never sets it leaves residents calling a placeholder number.
export default function AdminSettingsPage() {
  const qc = useQueryClient();
  const { data: estate } = useEstate();

  const [form, setForm] = useState({ name: "", location: "", totalUnits: "", securityPhone: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Populate once the estate loads (and re-sync after saves).
  useEffect(() => {
    if (estate) {
      setForm({
        name: estate.name ?? "",
        location: estate.location ?? "",
        totalUnits: estate.totalUnits != null ? String(estate.totalUnits) : "",
        securityPhone: (estate as { securityPhone?: string | null }).securityPhone ?? "",
      });
    }
  }, [estate]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () =>
      api.patch("/api/estates/me", {
        name: form.name.trim(),
        location: form.location.trim(),
        totalUnits: form.totalUnits ? Number(form.totalUnits) : null,
        securityPhone: form.securityPhone.trim() || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estate"] });
      setError(null);
      setMsg("Settings saved.");
    },
    onError: (e) => {
      setMsg(null);
      setError(e instanceof ApiError ? e.message : "Failed to save settings.");
    },
  });

  return (
    <div className="page-wrap" data-bottomnav="true">
      <TopBar title="Estate Settings" />
      <main className="container-list pt-5 pb-6 space-y-6 page-content">

        <section>
          <SectionTitle icon={<Building2 className="h-4 w-4" />}>Estate details</SectionTitle>
          <div className="tribal-card p-5 space-y-4 max-w-xl">
            <div>
              <Label className="font-semibold">Estate name</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <Label className="font-semibold">Location</Label>
              <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Athi River, Machakos" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-semibold">Total units</Label>
                <Input type="number" min={1} value={form.totalUnits} onChange={(e) => set("totalUnits", e.target.value)} />
              </div>
              <div>
                <Label className="font-semibold">Security desk phone</Label>
                <Input value={form.securityPhone} onChange={(e) => set("securityPhone", e.target.value)} placeholder="07XXXXXXXX" />
                <p className="text-xs text-tribal-earth mt-1">
                  This is the number residents one-tap call from the SOS page.
                </p>
              </div>
            </div>

            {msg && <p className="text-sm text-brand-green bg-brand-green/10 rounded-xl px-3 py-2">✓ {msg}</p>}
            {error && <p className="text-sm text-brand-red bg-brand-red/10 rounded-xl px-3 py-2">{error}</p>}

            <Button
              onClick={() => { setMsg(null); mutation.mutate(); }}
              loading={mutation.isPending}
              disabled={form.name.trim().length < 3 || form.location.trim().length < 2}
              className="gap-1.5"
            >
              <Save className="h-4 w-4" /> Save changes
            </Button>
          </div>
        </section>

        <section>
          <SectionTitle icon={<CreditCard className="h-4 w-4" />}>Your plan</SectionTitle>
          <BillingCard />
        </section>

        <section>
          <SectionTitle icon={<Download className="h-4 w-4" />}>Reports & exports</SectionTitle>
          <div className="tribal-card p-5 space-y-3 max-w-xl">
            <p className="text-sm text-tribal-earth">
              CSV downloads for AGMs, committee meetings, or your accountant.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="/api/analytics/export/levy" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-green bg-brand-green/10 hover:bg-brand-green/20 rounded-xl px-4 py-2 transition-colors">
                <Download className="h-4 w-4" /> Levy payments (CSV)
              </a>
              <a href="/api/analytics/export/residents" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-green bg-brand-green/10 hover:bg-brand-green/20 rounded-xl px-4 py-2 transition-colors">
                <Download className="h-4 w-4" /> Resident register (CSV)
              </a>
            </div>
          </div>
        </section>
      </main>

      <PageFooter />
      <BottomNav />
    </div>
  );
}
