import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Pencil, Trash2, Users, Search, Link2, Copy, Check, MessageCircle } from "lucide-react";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SectionLoader } from "@/components/shared/loading";
import { api } from "@/lib/api";
import { BRAND_NAME } from "@shared/brand";

interface EstateUser {
  id: string; phone: string; name: string;
  role: string; unitNumber: string | null; createdAt: string;
}

const ROLE_CONFIG: Record<string, { label: string; variant: string; emoji: string }> = {
  admin:    { label: "Admin",    variant: "warning", emoji: "👑" },
  security: { label: "Security", variant: "info",    emoji: "🛡️" },
  vendor:   { label: "Vendor",   variant: "success", emoji: "🔧" },
  resident: { label: "Resident", variant: "default", emoji: "🏠" },
};

// Role-specific helper copy so an admin knows exactly what each account
// type unlocks BEFORE creating it — the "clean accommodation" for security
// guards and vendors, who used to be an afterthought of the resident flow.
const ROLE_HINTS: Record<string, string> = {
  resident: "Full resident account — visitors, payments, maintenance, community.",
  security: "Gate account — visitor check-in/out, gate log, parcels, and SOS response. No access to payments or community data.",
  vendor: "Marketplace account — their listings and bookings only.",
  admin: "Full estate management access, including billing. Add sparingly.",
};

// Shared "here's the invite link" result panel — used after creating a
// user AND after re-issuing a link. Kenya-friendly sharing: copy,
// WhatsApp, or SMS in one tap.
function SetupLinkShare({ name, phone, link, expiresAt, onDone }: {
  name: string; phone: string; link: string; expiresAt: string; onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const msg = `Habari ${name}! Your ${BRAND_NAME} account is ready. Set your password here (link valid until ${new Date(expiresAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}): ${link}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { /* clipboard unavailable — the link is visible to select manually */ }
  };

  return (
    <div className="px-6 pb-6 space-y-3">
      <p className="text-sm text-[#212121] font-semibold">✓ Invite ready for {name}</p>
      <div className="bg-[#1B5E20]/8 border border-[#1B5E20]/20 rounded-xl p-3">
        <p className="text-xs text-[#6B5D45] mb-1">One-time setup link — they choose their own password:</p>
        <p className="font-mono text-xs text-[#1B5E20] break-all select-all">{link}</p>
        <p className="text-xs text-[#D4C9A8] mt-2">Valid 7 days · single use · a new link cancels this one</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button variant="secondary" size="sm" className="gap-1" onClick={copy}>
          {copied ? <Check className="h-3.5 w-3.5 text-brand-green" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <a
          href={`https://wa.me/${phone.replace("+", "")}?text=${encodeURIComponent(msg)}`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#25D366] text-white text-sm font-semibold px-3 py-2 hover:opacity-90 transition-opacity"
        >
          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
        </a>
        <a
          href={`sms:${phone}?body=${encodeURIComponent(msg)}`}
          className="inline-flex items-center justify-center gap-1 rounded-xl border border-tribal-border text-[#1B5E20] text-sm font-semibold px-3 py-2 hover:bg-tribal-cream-dark transition-colors"
        >
          SMS
        </a>
      </div>
      <Button className="w-full" onClick={onDone}>Done</Button>
    </div>
  );
}

interface SetupLinkResult { name: string; phone: string; link: string; expiresAt: string }

function AddUserDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", phone: "", role: "resident", unitNumber: "" });
  const [result, setResult] = useState<SetupLinkResult | null>(null);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () =>
      api.post<{ id: string; name: string; phone: string }>("/api/users", {
        name: form.name,
        phone: form.phone,
        role: form.role,
        unitNumber: form.role === "resident" && form.unitNumber ? form.unitNumber : undefined,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["estate-users"] });
      const r = res as unknown as { data: { name: string; phone: string }; setupLink: string; setupLinkExpiresAt: string };
      setResult({ name: r.data.name, phone: r.data.phone, link: r.setupLink, expiresAt: r.setupLinkExpiresAt });
    },
  });

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-xl bg-[#1B5E20] flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <DialogTitle>Add User</DialogTitle>
          </div>
        </DialogHeader>
        {result ? (
          <SetupLinkShare {...result} onDone={onClose} />
        ) : (
          <>
            <div className="px-6 pb-2 space-y-3">
              <div>
                <Label className="text-[#212121] font-semibold">Role</Label>
                <Select value={form.role} onValueChange={(v) => set("role", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resident">🏠 Resident</SelectItem>
                    <SelectItem value="security">🛡️ Security guard</SelectItem>
                    <SelectItem value="vendor">🔧 Vendor / service provider</SelectItem>
                    <SelectItem value="admin">👑 Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-tribal-earth mt-1">{ROLE_HINTS[form.role]}</p>
              </div>
              <div>
                <Label className="text-[#212121] font-semibold">Full name</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={form.role === "vendor" ? "e.g. Otieno Plumbing" : "Jane Mwangi"} />
              </div>
              <div>
                <Label className="text-[#212121] font-semibold">Phone</Label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="07XXXXXXXX" />
              </div>
              {form.role === "resident" && (
                <div>
                  <Label className="text-[#212121] font-semibold">Unit / House number</Label>
                  <Input value={form.unitNumber} onChange={(e) => set("unitNumber", e.target.value)} placeholder="A14" />
                </div>
              )}
              <p className="text-xs text-tribal-earth">
                No passwords to share — you&apos;ll get a one-time link they open to set their own.
              </p>
              {mutation.isError && (
                <p className="text-sm text-[#B71C1C]">{(mutation.error as Error).message}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button onClick={() => mutation.mutate()} loading={mutation.isPending}
                disabled={!form.name || !form.phone}>
                Create &amp; get invite link
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({ user, onClose }: { user: EstateUser; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(user.name);
  const [unitNumber, setUnitNumber] = useState(user.unitNumber ?? "");
  const [role, setRole] = useState(user.role);

  const mutation = useMutation({
    mutationFn: () => api.patch(`/api/users/${user.id}`, {
      name, role, unitNumber: unitNumber || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["estate-users"] }); onClose(); },
  });

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-xl bg-[#D47A00]/10 flex items-center justify-center">
              <Pencil className="h-5 w-5 text-[#D47A00]" />
            </div>
            <DialogTitle>Edit {user.name}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="px-6 pb-2 space-y-3">
          <div>
            <Label className="text-[#212121] font-semibold">Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="resident">🏠 Resident</SelectItem>
                <SelectItem value="security">🛡️ Security</SelectItem>
                <SelectItem value="vendor">🔧 Vendor</SelectItem>
                <SelectItem value="admin">👑 Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[#212121] font-semibold">Unit / House number</Label>
            <Input value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} placeholder="A14" />
          </div>
          {mutation.isError && (
            <p className="text-sm text-[#B71C1C]">{(mutation.error as Error).message}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<EstateUser | null>(null);
  const [search, setSearch] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<EstateUser | null>(null);
  const [linkResult, setLinkResult] = useState<SetupLinkResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Re-issue an invite/setup link — the recovery path when a guard or
  // vendor lost their link, it expired, or they've forgotten their
  // password and SMS reset isn't an option.
  const reissue = useMutation({
    mutationFn: (id: string) => api.post<{ name: string; phone: string }>(`/api/users/${id}/setup-link`, {}),
    onSuccess: (res) => {
      const r = res as unknown as { data: { name: string; phone: string }; setupLink: string; setupLinkExpiresAt: string };
      setActionError(null);
      setLinkResult({ name: r.data.name, phone: r.data.phone, link: r.setupLink, expiresAt: r.setupLinkExpiresAt });
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : "Failed to create invite link."),
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["estate-users"],
    queryFn: () => api.get<EstateUser[]>("/api/users").then((r) => r.data),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api.delete(`/api/users/${id}`),
    onSuccess: () => { setConfirmRemove(null); setActionError(null); qc.invalidateQueries({ queryKey: ["estate-users"] }); },
    onError: (err) => { setConfirmRemove(null); setActionError(err instanceof Error ? err.message : "Failed to remove user."); },
  });

  const filtered = users?.filter((u) =>
    !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.phone.includes(search) ||
    (u.unitNumber ?? "").toLowerCase().includes(search.toLowerCase()),
  ) ?? [];

  const byRole = filtered.reduce<Record<string, EstateUser[]>>((acc, u) => {
    (acc[u.role] = acc[u.role] ?? []).push(u);
    return acc;
  }, {});

  return (
    <div className="page-wrap" data-bottomnav="true">
      <TopBar title="Users" />
      <main className="container-list pt-4 space-y-4 page-content">
        {actionError && (
          <div role="alert" className="flex items-start justify-between gap-2 rounded-xl bg-[#B71C1C]/10 border border-[#B71C1C]/20 px-3 py-2.5 text-sm text-[#B71C1C]">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="font-bold px-1" aria-label="Dismiss">×</button>
          </div>
        )}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B5D45]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone or unit..."
              className="pl-9"
            />
          </div>
          <Button onClick={() => setAddOpen(true)} className="gap-1.5">
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <SectionLoader />
        ) : !filtered.length ? (
          <div className="tribal-card p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#1B5E20]/10 flex items-center justify-center mx-auto mb-3">
              <Users className="h-7 w-7 text-[#1B5E20]" />
            </div>
            <p className="font-semibold text-[#212121] mb-1">
              {search ? "No results found" : "No users yet"}
            </p>
          </div>
        ) : (
          ["admin", "security", "vendor", "resident"].map((role) => {
            const group = byRole[role];
            if (!group?.length) return null;
            const cfg = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG];
            if (!cfg) return null;
            return (
              <section key={role}>
                <p className="section-label mb-2">
                  {cfg.emoji} {cfg.label}s ({group.length})
                </p>
                <div className="card-grid">
                  {group.map((u) => (
                    <Card key={u.id}>
                      <CardContent className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-full bg-[#1B5E20] flex items-center justify-center shrink-0">
                            <span className="text-white font-bold text-sm">{u.name.charAt(0)}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm text-[#212121]">{u.name}</p>
                              {u.unitNumber && (
                                <Badge variant="default" className="text-xs">{u.unitNumber}</Badge>
                              )}
                            </div>
                            <p className="text-xs text-[#6B5D45]">{u.phone}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-[#1B5E20]"
                            title="New invite link"
                            aria-label={`New invite link for ${u.name}`}
                            onClick={() => reissue.mutate(u.id)}
                            disabled={reissue.isPending}
                          >
                            <Link2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-[#6B5D45]"
                            onClick={() => setEditUser(u)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-[#B71C1C]"
                            onClick={() => setConfirmRemove(u)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </main>

      {addOpen && <AddUserDialog onClose={() => setAddOpen(false)} />}
      {editUser && <EditUserDialog user={editUser} onClose={() => setEditUser(null)} />}
      {linkResult && (
        <Dialog open onOpenChange={(v) => { if (!v) setLinkResult(null); }}>
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center gap-3 mt-2">
                <div className="w-10 h-10 rounded-xl bg-[#1B5E20] flex items-center justify-center">
                  <Link2 className="h-5 w-5 text-white" />
                </div>
                <DialogTitle>New invite link</DialogTitle>
              </div>
            </DialogHeader>
            <SetupLinkShare {...linkResult} onDone={() => setLinkResult(null)} />
          </DialogContent>
        </Dialog>
      )}
      <ConfirmDialog
        open={!!confirmRemove}
        onOpenChange={(v) => { if (!v) setConfirmRemove(null); }}
        title="Remove this user?"
        description={confirmRemove ? `${confirmRemove.name} will lose access to ${BRAND_NAME} immediately.` : ""}
        confirmLabel="Remove"
        cancelLabel="Keep them"
        loading={deactivate.isPending}
        onConfirm={() => confirmRemove && deactivate.mutate(confirmRemove.id)}
      />
      <BottomNav />
    </div>
  );
}
