import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { api } from "@/lib/api";

interface EstateLite { id: string; name: string; location: string }

export default function RegisterPage() {
  const { register, user } = useAuth();
  const [, setLocation] = useLocation();

  const [form, setForm] = useState({
    name: "", phone: "", password: "", confirm: "",
    estateId: "", unitNumber: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: estates } = useQuery({
    queryKey: ["estates-public"],
    queryFn: () => api.get<EstateLite[]>("/api/auth/estates").then((r) => r.data),
  });

  if (user) {
    setLocation(`/dashboard/${user.role}`);
    return null;
  }

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      await register({
        phone: form.phone, password: form.password, name: form.name,
        estateId: form.estateId || undefined,
        unitNumber: form.unitNumber || undefined,
      });
      setLocation("/dashboard/resident");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kitenge-hero min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <img
              src="/logo.svg"
              alt="JiraniHub"
              className="h-20 w-20 object-contain drop-shadow-xl"
              onError={(e) => {
                const t = e.currentTarget;
                t.style.display = "none";
                const fb = t.nextElementSibling as HTMLElement;
                if (fb) fb.style.removeProperty("display");
              }}
            />
            <div
              className="w-16 h-16 rounded-2xl bg-white/15 items-center justify-center"
              style={{ display: "none" }}
            >
              <span className="font-black text-2xl text-[#D4A017]">JH</span>
            </div>
          </div>
          <h1 className="font-black text-2xl text-white tracking-tight">JiraniHub</h1>
          <p className="text-white/60 text-sm mt-0.5">Create your resident account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#F5F1E8] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="maasai-stripe rounded-full mb-2" />

          <div>
            <Label className="text-[#212121] font-semibold">Full name</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)}
              placeholder="Jane Mwangi" required />
          </div>

          <div>
            <Label className="text-[#212121] font-semibold">Phone number</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)}
              placeholder="0722 123 456" required />
          </div>

          <div>
            <Label className="text-[#212121] font-semibold">Estate</Label>
            <Select value={form.estateId} onValueChange={(v) => set("estateId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select your estate (optional)" />
              </SelectTrigger>
              <SelectContent>
                {estates?.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} — {e.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-[#6B5D45] mt-1">Can be assigned by your admin later</p>
          </div>

          {form.estateId && (
            <div>
              <Label className="text-[#212121] font-semibold">Unit / House number</Label>
              <Input value={form.unitNumber} onChange={(e) => set("unitNumber", e.target.value)}
                placeholder="A14" />
            </div>
          )}

          <div>
            <Label className="text-[#212121] font-semibold">Password</Label>
            <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)}
              placeholder="At least 8 characters" required />
          </div>

          <div>
            <Label className="text-[#212121] font-semibold">Confirm password</Label>
            <Input type="password" value={form.confirm} onChange={(e) => set("confirm", e.target.value)}
              placeholder="Repeat your password" required />
          </div>

          {error && (
            <div className="bg-[#B71C1C]/10 border border-[#B71C1C]/20 rounded-xl px-3 py-2.5 text-sm text-[#B71C1C]">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            Create Account
          </Button>

          <p className="text-center text-sm text-[#6B5D45]">
            Already have an account?{" "}
            <a href="/login" className="text-[#1B5E20] font-bold">Sign in</a>
          </p>
        </form>
      </div>
    </div>
  );
}
