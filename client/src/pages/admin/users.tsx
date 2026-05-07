import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Pencil, Trash2, Users } from "lucide-react";
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
import { SectionLoader } from "@/components/shared/loading";
import { api } from "@/lib/api";

interface EstateUser {
  id: string; phone: string; name: string;
  role: string; unitNumber: string | null; createdAt: string;
}

const roleVariant: Record<string, "default" | "warning" | "info" | "success"> = {
  admin: "warning",
  security: "info",
  vendor: "success",
  resident: "default",
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
        <DialogHeader><DialogTitle>Add Estate Resident</DialogTitle></DialogHeader>
        {result ? (
          <div className="px-6 pb-6 space-y-3">
            <p className="text-sm text-gray-700">Account created successfully.</p>
            <div className="bg-[#1A5C38]/5 border border-[#1A5C38]/20 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Temporary password — share securely:</p>
              <p className="font-mono font-bold text-lg text-[#1A5C38]">{result.tempPassword}</p>
              <p className="text-xs text-gray-400 mt-2">The resident should change this after first login.</p>
            </div>
            <Button className="w-full" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <>
            <div className="px-6 pb-2 space-y-3">
              <div><Label>Full name</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Jane Mwangi" /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="07XXXXXXXX" /></div>
              <div>
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => set("role", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resident">Resident</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.role === "resident" && (
                <div><Label>Unit / House no.</Label><Input value={form.unitNumber} onChange={(e) => set("unitNumber", e.target.value)} placeholder="A14" /></div>
              )}
              <div>
                <Label>Password (leave blank to auto-generate)</Label>
                <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Auto-generated if empty" />
              </div>
              {mutation.isError && (
                <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button onClick={() => mutation.mutate()} loading={mutation.isPending}
                disabled={!form.name || !form.phone}>
                Create account
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
        <DialogHeader><DialogTitle>Edit {user.name}</DialogTitle></DialogHeader>
        <div className="px-6 pb-2 space-y-3">
          <div><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="resident">Resident</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Unit / House no.</Label><Input value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} placeholder="A14" /></div>
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

  const { data: users, isLoading } = useQuery({
    queryKey: ["estate-users"],
    queryFn: () => api.get<EstateUser[]>("/api/users").then((r) => r.data),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api.delete(`/api/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["estate-users"] }),
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
    <div className="min-h-screen bg-white pb-20">
      <TopBar title="Users" />
      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        <div className="flex gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or unit…" className="flex-1" />
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <SectionLoader />
        ) : !filtered.length ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">{search ? "No matches." : "No users yet."}</p>
          </div>
        ) : (
          ["admin", "security", "vendor", "resident"].map((role) => {
            const group = byRole[role];
            if (!group?.length) return null;
            return (
              <section key={role}>
                <h2 className="font-semibold text-xs text-gray-400 uppercase tracking-wide mb-2 capitalize">
                  {role}s ({group.length})
                </h2>
                <div className="space-y-2">
                  {group.map((u) => (
                    <Card key={u.id}>
                      <CardContent className="py-3 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm text-gray-900">{u.name}</p>
                            {u.unitNumber && (
                              <Badge variant="default" className="text-xs">{u.unitNumber}</Badge>
                            )}
                            <Badge variant={roleVariant[u.role] ?? "default"} className="text-xs capitalize">
                              {u.role}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{u.phone}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
                            onClick={() => setEditUser(u)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500"
                            onClick={() => {
                              if (confirm(`Deactivate ${u.name}?`)) deactivate.mutate(u.id);
                            }}>
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
      <BottomNav />
    </div>
  );
}
