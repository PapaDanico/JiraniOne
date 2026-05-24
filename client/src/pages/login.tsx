import { Link } from "wouter";
import { useRef } from "react";
import { ShieldCheck, Smartphone, Wifi } from "lucide-react";
import { AuthGate } from "@/components/shared/role-gate";
import { LoginForm, type LoginFormHandle } from "@/components/auth/login-form";
import { DemoBench } from "@/components/auth/demo-bench";

export default function LoginPage() {
  const formRef = useRef<LoginFormHandle | null>(null);

  return (
    <AuthGate>
      <div className="kitenge-hero relative min-h-[100dvh] flex flex-col items-center justify-center px-4 py-8">
        <div className="ring-deco relative w-full max-w-sm">
          {/* Brand block — ringed logo (Diagnostic ref) */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center mb-3">
              <div
                className="relative w-24 h-24 rounded-full bg-brand-gold flex items-center justify-center"
                style={{
                  boxShadow:
                    "0 0 0 6px rgba(212, 160, 23, 0.10), 0 0 0 14px rgba(212, 160, 23, 0.05)",
                }}
              >
                <img
                  src="/logo.svg"
                  alt="JiraniHub"
                  className="h-14 w-14 object-contain"
                  onError={(e) => {
                    const t = e.currentTarget;
                    t.style.display = "none";
                    const fb = t.nextElementSibling as HTMLElement;
                    if (fb) fb.style.display = "block";
                  }}
                />
                <span
                  className="font-black text-3xl text-brand-green"
                  style={{ display: "none" }}
                >
                  JH
                </span>
              </div>
            </div>
            <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">
              JiraniHub
            </h1>
            <p className="font-serif italic text-base text-brand-gold mt-1">
              Smart estate management · Kenya
            </p>
          </div>

          {/* Card */}
          <div className="bg-tribal-cream rounded-3xl shadow-hero overflow-hidden">
            <div className="maasai-stripe" />

            <div className="px-6 pt-6 pb-6">
              <div className="mb-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tribal-earth">
                  Sign in
                </p>
                <h2 className="font-display font-extrabold text-2xl text-tribal-charcoal mt-0.5">
                  Welcome back
                </h2>
                <p className="text-sm text-tribal-earth mt-1.5 leading-snug">
                  Use your Kenyan phone number to continue. Your role (resident,
                  admin, security, or vendor) was set when your account was created.
                </p>
              </div>

              <LoginForm ref={formRef} />

              <DemoBench
                onPick={(phone) => {
                  formRef.current?.setPhone(phone);
                  formRef.current?.focusPassword();
                }}
              />

              <div className="mt-6 flex items-center gap-3">
                <div className="flex-1 h-px bg-tribal-border" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-tribal-muted">
                  New here
                </span>
                <div className="flex-1 h-px bg-tribal-border" />
              </div>

              <Link
                href="/register"
                className="mt-4 w-full inline-flex items-center justify-center px-4 py-3 rounded-xl border border-tribal-border bg-white text-brand-green font-semibold text-sm hover:bg-tribal-cream-dark transition-colors min-h-[48px]"
              >
                Create a resident account
              </Link>
            </div>
          </div>

          {/* Trust strip */}
          <div className="mt-6 grid grid-cols-3 gap-2 text-white/80">
            <div className="flex flex-col items-center gap-1 text-[10px] font-semibold">
              <ShieldCheck className="h-4 w-4 text-brand-gold" />
              <span>Secure login</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-[10px] font-semibold">
              <Smartphone className="h-4 w-4 text-brand-gold" />
              <span>M-PESA ready</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-[10px] font-semibold">
              <Wifi className="h-4 w-4 text-brand-gold" />
              <span>Works on 3G</span>
            </div>
          </div>

          <p className="text-center text-[11px] text-white/50 mt-6">
            © {new Date().getFullYear()} JiraniHub · Built for Kenya
          </p>
        </div>
      </div>
    </AuthGate>
  );
}
