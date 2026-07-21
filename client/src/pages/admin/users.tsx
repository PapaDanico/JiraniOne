import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Pencil, Trash2, Users, Search } from "lucide-react";
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

function AddUserDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "", phone: "", role: "resident", unitNumber: "", password: "",
  });
  const [result, setResult] = useState<{ tempPassword: string } | null>(null);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => api.post<{ tempPassword: string }>("/api/users", {
      ...form,
      unitNumber: form.unitNumber || undefined,
      password: form.password || undefined,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["estate-users"] });
      setResult({ tempPassword: res.data.tempPassword });
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
            <DialogTitle>Add Resident</DialogTitle>
          </div>
        </DialogHeader>
        {result ? (
          <div className="px-6 pb-6 space-y-3">
            <p className="text-sm text-[#212121] font-semibold">✓ Account created!</p>
            <div className="bg-[#1B5E20]/8 border border-[#1B5E20]/20 rounded-xl p-4">
              <p className="text-xs text-[#6B5D45] mb-1">Temporary password — share securely:</p>
              <p className="font-mono font-black text-lg text-[#1B5E20]">{result.tempPassword}</p>
              <p className="text-xs text-[#D4C9A8] mt-2">Ask the user to change their password after first login.</p>
            </div>
            <Button className="w-full" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <>
            <div className="px-6 pb-2 space-y-3">
              <div>
                <Label className="text-[#212121] font-semibold">Full name</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Jane Mwangi" />
              </div>
              <div>
                <Label className="text-[#212121] font-semibold">Phone</Label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="07XXXXXXXX" />
              </div>
              <div>
                <Label className="text-[#212121] font-semibold">Role</Label>
                <Select value={form.role} onValueChange={(v) => set("role", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resident">🏠 Resident</SelectItem>
                    <SelectItem value="security">🛡️ Security</SelectItem>
                    <SelectItem value="vendor">🔧 Vendor</SelectItem>
                    <SelectItem value="admin">👑 Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.role === "resident" && (
                <div>
                  <Label className="text-[#212121] font-semibold">Unit / House number</Label>
                  <Input value={form.unitNumber} onChange={(e) => set("unitNumber", e.target.value)} placeholder="A14" />
                </div>
              )}
              <div>
                <Label className="text-[#212121] font-semibold">Password (leave blank to auto-generate)</Label>
                <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Will be auto-generated if left blank" />
              </div>
              {mutation.isError && (
                <p className="text-sm text-[#B71C1C]">{(mutation.error as Error).message}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button onClick={() => mutation.mutate()} loading={mutation.isPending}
                disabled={!form.name || !form.phone}>
                Create Account
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

  const { data: users, isLoading } = useQuery({
    queryKey: ["estate-users"],
    queryFn: () => api.get<EstateUser[]>("/api/users").then((r) => r.data),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api.delete(`/api/users/${id}`),
    onSuccess: () => { setConfirmRemove(null); qc.invalidateQueries({ queryKey: ["estate-users"] }); },
    onError: (err) => alert(err instanceof Error ? err.message : "Failed to remove user."),
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
    <div className="page-wrap">
      <TopBar title="Users" />
      <main className="container-list pt-4 space-y-4 page-content">
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
      <ConfirmDialog
        open={!!confirmRemove}
        onOpenChange={(v) => { if (!v) setConfirmRemove(null); }}
        title="Remove this user?"
        description={confirmRemove ? `${confirmRemove.name} will lose access to JiraniHub immediately.` : ""}
        confirmLabel="Remove"
        cancelLabel="Keep them"
        loading={deactivate.isPending}
        onConfirm={() => confirmRemove && deactivate.mutate(confirmRemove.id)}
      />
      <BottomNav />
    </div>
  );
}
