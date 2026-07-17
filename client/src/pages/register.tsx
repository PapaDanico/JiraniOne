import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
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
  const [consent, setConsent] = useState(false);
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
    if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      setError("Password must include at least one letter and one digit");
      return;
    }
    if (!consent) {
      setError("Please agree to the Privacy Policy and Terms to continue.");
      return;
    }
    setLoading(true);
    try {
      await register({
        phone: form.phone, password: form.password, name: form.name,
        estateId: form.estateId || undefined,
        unitNumber: form.unitNumber || undefined,
        consent,
      });
      setLocation("/dashboard/resident");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kitenge-hero relative min-h-[100dvh] flex flex-col items-center justify-center px-4 py-8">
      <div className="ring-deco relative w-full max-w-sm">
        {/* Brand block (parity with /login) */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <div
              className="relative w-20 h-20 rounded-full bg-brand-gold flex items-center justify-center"
              style={{
                boxShadow:
                  "0 0 0 6px rgba(212, 160, 23, 0.10), 0 0 0 14px rgba(212, 160, 23, 0.05)",
              }}
            >
              <img
                src="/brand/logo-mark.webp"
                alt="JiraniHub"
                className="h-12 w-12 object-contain"
                onError={(e) => {
                  const t = e.currentTarget;
                  t.style.display = "none";
                  const fb = t.nextElementSibling as HTMLElement;
                  if (fb) fb.style.display = "block";
                }}
              />
              <span
                className="font-black text-2xl text-brand-green"
                style={{ display: "none" }}
              >
                JH
              </span>
            </div>
          </div>
          <h1 className="font-display font-extrabold text-2xl text-white tracking-tight">
            JiraniHub
          </h1>
          <p className="font-medium text-base text-brand-gold mt-1">
            Create your resident account
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-tribal-cream rounded-3xl shadow-hero overflow-hidden"
        >
          <div className="maasai-stripe" />
          <div className="px-6 py-6 space-y-4">
            <div>
              <Label className="text-tribal-charcoal font-semibold">Full name</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Jane Mwangi"
                required
              />
            </div>

            <div>
              <Label className="text-tribal-charcoal font-semibold">Phone number</Label>
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="0722 123 456"
                required
              />
            </div>

            <div>
              <Label className="text-tribal-charcoal font-semibold">Estate</Label>
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
              <p className="text-xs text-tribal-earth mt-1">
                Can be assigned by your admin later.
              </p>
            </div>

            {form.estateId && (
              <div>
                <Label className="text-tribal-charcoal font-semibold">
                  Unit / House number
                </Label>
                <Input
                  value={form.unitNumber}
                  onChange={(e) => set("unitNumber", e.target.value)}
                  placeholder="A14"
                />
              </div>
            )}

            <div>
              <Label className="text-tribal-charcoal font-semibold">Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="At least 8 characters"
                required
              />
            </div>

            <div>
              <Label className="text-tribal-charcoal font-semibold">Confirm password</Label>
              <Input
                type="password"
                value={form.confirm}
                onChange={(e) => set("confirm", e.target.value)}
                placeholder="Repeat your password"
                required
              />
            </div>

            <label className="flex items-start gap-2 text-xs text-tribal-earth cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-brand-green"
                required
              />
              <span>
                I agree to the{" "}
                <Link href="/privacy" className="text-brand-green font-bold underline">
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link href="/terms" className="text-brand-green font-bold underline">
                  Terms of Service
                </Link>
                . I consent to JiraniHub processing my data under the Kenya Data
                Protection Act, 2019.
              </span>
            </label>

            {error && (
              <div className="rounded-xl bg-brand-red/10 border border-brand-red/30 px-3 py-2.5 text-sm text-brand-red flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" loading={loading} disabled={!consent}>
              Create Account
            </Button>

            <p className="text-center text-sm text-tribal-earth">
              Already have an account?{" "}
              <Link href="/login" className="text-brand-green font-bold">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
