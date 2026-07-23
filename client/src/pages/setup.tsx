import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { BRAND_NAME } from "@shared/brand";

type Status = "loading" | "ready" | "done" | "invalid";

const inputBase =
  "w-full rounded-xl border bg-white pl-12 pr-3 py-3 text-sm text-[#212121] " +
  "placeholder:text-[#B0A080] min-h-[48px] transition-shadow " +
  "focus:outline-none focus:ring-2 focus:ring-[#1B5E20]/30 focus:border-[#1B5E20]";

export default function SetupPage() {
  const { token } = useParams<{ token: string }>();

  const [status, setStatus] = useState<Status>("loading");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }

    // api.get already unwraps to { data: T } — double-wrapping the generic
    // here made data.data undefined at runtime, so EVERY valid link threw
    // in this .then and rendered as "invalid or expired".
    api.get<{ phone: string; name: string }>(`/api/auth/setup/${token}`)
      .then(({ data }) => {
        setPhone(data.phone);
        setName(data.name);
        setStatus("ready");
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setError("Password must contain at least one letter and one digit.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/auth/setup", { token, password });
      // The session cookie is set — ask who we are so guards land on the
      // gate dashboard and vendors on theirs, not on the resident one.
      // Full-page navigation (not setLocation) so AuthProvider boots
      // fresh with the new session instead of serving its stale
      // logged-out state.
      const me = await api
        .get<{ role: string }>("/api/auth/me")
        .then((r) => r.data)
        .catch(() => null);
      setStatus("done");
      setTimeout(() => {
        window.location.href = me ? `/dashboard/${me.role}` : "/login";
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof ApiError
        ? err.message
        : "Something went wrong. The link may have expired.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F7F5]">
        <p className="text-sm text-[#757575]">Verifying your setup link…</p>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F7F5] p-4">
        <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm text-center">
          <AlertCircle className="mx-auto mb-4 text-[#BB0000]" size={40} />
          <h1 className="text-xl font-semibold text-[#212121] mb-2">Link invalid or expired</h1>
          <p className="text-sm text-[#757575]">
            This setup link has already been used or has expired. Ask your estate
            admin to send you a new one.
          </p>
        </div>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F7F5] p-4">
        <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm text-center">
          <CheckCircle2 className="mx-auto mb-4 text-[#1A5C38]" size={40} />
          <h1 className="text-xl font-semibold text-[#212121] mb-2">Account ready!</h1>
          <p className="text-sm text-[#757575]">Signing you in…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F7F5] p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1A5C38]/10 mb-4">
            <Lock className="text-[#1A5C38]" size={26} />
          </div>
          <h1 className="text-2xl font-bold text-[#212121]">Set up your account</h1>
          <p className="text-sm text-[#757575] mt-1">
            Welcome, {name}! Choose a password to activate your {BRAND_NAME} account.
          </p>
        </div>

        {/* Phone display */}
        <div className="relative mb-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#757575]">
            <User size={16} />
          </span>
          <input
            type="text"
            value={phone}
            readOnly
            className={cn(inputBase, "bg-[#F8F7F5] cursor-not-allowed text-[#757575]")}
            aria-label="Phone number (pre-filled)"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Password */}
          <div>
            <Label htmlFor="password" className="text-sm font-medium text-[#212121] mb-1.5 block">
              Password
            </Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#757575]">
                <Lock size={16} />
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 chars, letter + digit"
                className={inputBase}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#757575] hover:text-[#1A5C38] transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <Label htmlFor="confirm" className="text-sm font-medium text-[#212121] mb-1.5 block">
              Confirm password
            </Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#757575]">
                <Lock size={16} />
              </span>
              <input
                id="confirm"
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                className={cn(
                  inputBase,
                  confirm && confirm !== password
                    ? "border-[#BB0000] focus:ring-[#BB0000]/30 focus:border-[#BB0000]"
                    : "",
                )}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-[#BB0000]/10 px-4 py-3 text-sm text-[#BB0000]"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-xl bg-[#1A5C38] hover:bg-[#1A5C38]/90 text-white font-semibold text-sm transition-all"
          >
            {submitting ? "Setting up…" : "Activate account"}
          </Button>
        </form>

        <p className="text-center text-xs text-[#757575] mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-[#1A5C38] font-medium hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
