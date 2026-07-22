import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Lock, Phone } from "lucide-react";
import { AuthGate } from "@/components/shared/role-gate";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { BRAND_NAME } from "@shared/brand";

type Step = "request" | "verify" | "done";

const inputBase =
  "w-full rounded-xl border bg-white pl-12 pr-3 py-3 text-sm text-[#212121] " +
  "placeholder:text-[#B0A080] min-h-[48px] transition-shadow " +
  "focus:outline-none focus:ring-2 focus:ring-[#1B5E20]/30 focus:border-[#1B5E20]";

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("request");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const requestOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const { data } = await api.post<{ message: string }>(
        "/api/auth/forgot-password",
        { phone },
      );
      setInfo(data.message);
      setStep("verify");
      setResendIn(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset code.");
    } finally {
      setLoading(false);
    }
  };

  const verifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { phone, otp, password });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGate>
      <div className="kitenge-hero relative min-h-[100dvh] flex flex-col items-center justify-center px-4 py-8">
        <div className="relative w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#D4A017]/15 border border-[#D4A017]/30 mb-3">
              <KeyRound className="h-6 w-6 text-[#D4A017]" />
            </div>
            <h1 className="font-black text-2xl text-white tracking-tight">
              {step === "done" ? "Password reset" : "Reset password"}
            </h1>
            <p className="text-white/70 text-xs mt-1 tracking-wide uppercase font-semibold">
              {BRAND_NAME} Account Recovery
            </p>
          </div>

          <div className="bg-[#F5F1E8] rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] overflow-hidden">
            <div className="maasai-stripe" />

            <div className="px-6 pt-6 pb-6">
              {step === "request" && (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B5D45]">
                    Step 1 of 2
                  </p>
                  <h2 className="text-xl font-black text-[#212121] mt-0.5">
                    Verify your phone
                  </h2>
                  <p className="text-sm text-[#6B5D45] mt-1.5 mb-5">
                    We'll send a 6-digit code by SMS. Standard Safaricom rates may apply.
                  </p>

                  <form onSubmit={requestOtp} className="space-y-4" noValidate>
                    <div>
                      <Label className="text-[#212121] font-semibold text-sm">Phone number</Label>
                      <div className="relative mt-1.5">
                        <span className="absolute inset-y-0 left-0 flex items-center gap-1.5 pl-3 text-[#6B5D45] pointer-events-none">
                          <Phone className="h-4 w-4" />
                          <span className="text-xs font-semibold">+254</span>
                        </span>
                        <input
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          required
                          placeholder="722 123 456"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className={cn(inputBase, "pl-[5.25rem] border-[#D4C9A8]")}
                        />
                      </div>
                    </div>

                    {error && <ErrorBanner message={error} />}

                    <Button
                      type="submit"
                      className="w-full text-base py-3 min-h-[48px]"
                      loading={loading}
                    >
                      Send reset code
                    </Button>
                  </form>
                </>
              )}

              {step === "verify" && (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B5D45]">
                    Step 2 of 2
                  </p>
                  <h2 className="text-xl font-black text-[#212121] mt-0.5">
                    Enter the code
                  </h2>
                  <p className="text-sm text-[#6B5D45] mt-1.5 mb-5">
                    {info ?? `Code sent to ${phone}.`}
                  </p>

                  <form onSubmit={verifyAndReset} className="space-y-4" noValidate>
                    <div>
                      <Label className="text-[#212121] font-semibold text-sm">6-digit code</Label>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        required
                        placeholder="123 456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="mt-1.5 w-full rounded-xl border border-[#D4C9A8] bg-white px-3 py-3 text-center text-2xl font-black tracking-[0.5em] text-[#212121] placeholder:text-[#D4C9A8] min-h-[56px] focus:outline-none focus:ring-2 focus:ring-[#1B5E20]/30 focus:border-[#1B5E20]"
                      />
                    </div>

                    <div>
                      <Label className="text-[#212121] font-semibold text-sm">New password</Label>
                      <div className="relative mt-1.5">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B5D45] pointer-events-none">
                          <Lock className="h-4 w-4" />
                        </span>
                        <input
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          required
                          placeholder="At least 8 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={cn(inputBase, "pr-12 border-[#D4C9A8]")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#6B5D45] hover:text-[#1B5E20]"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-[#212121] font-semibold text-sm">Confirm password</Label>
                      <div className="relative mt-1.5">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B5D45] pointer-events-none">
                          <Lock className="h-4 w-4" />
                        </span>
                        <input
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          required
                          placeholder="Repeat your new password"
                          value={confirm}
                          onChange={(e) => setConfirm(e.target.value)}
                          className={cn(inputBase, "border-[#D4C9A8]")}
                        />
                      </div>
                    </div>

                    {error && <ErrorBanner message={error} />}

                    <Button
                      type="submit"
                      className="w-full text-base py-3 min-h-[48px]"
                      loading={loading}
                    >
                      Reset password
                    </Button>

                    <div className="flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => { setStep("request"); setOtp(""); setError(null); }}
                        className="text-[#6B5D45] hover:text-[#1B5E20] font-semibold inline-flex items-center gap-1"
                      >
                        <ArrowLeft className="h-3 w-3" />
                        Change number
                      </button>
                      <button
                        type="button"
                        disabled={resendIn > 0 || loading}
                        onClick={() => requestOtp()}
                        className="text-[#1B5E20] font-bold disabled:text-[#B0A080] disabled:cursor-not-allowed"
                      >
                        {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {step === "done" && (
                <div className="text-center py-2">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#1B5E20]/10 mb-3">
                    <CheckCircle2 className="h-8 w-8 text-[#1B5E20]" />
                  </div>
                  <h2 className="text-xl font-black text-[#212121]">All set</h2>
                  <p className="text-sm text-[#6B5D45] mt-1.5 mb-5">
                    Your password has been reset. Sign in with the new password to continue.
                  </p>
                  <Button
                    className="w-full text-base py-3 min-h-[48px]"
                    onClick={() => setLocation("/login")}
                  >
                    Go to sign in
                  </Button>
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-sm text-white/70 mt-6">
            Remembered it?{" "}
            <Link href="/login" className="text-[#D4A017] font-bold underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </AuthGate>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl bg-[#B71C1C]/10 border border-[#B71C1C]/30 px-3 py-2.5 text-sm text-[#8B0000] flex items-start gap-2"
    >
      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
