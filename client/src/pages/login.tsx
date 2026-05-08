import { Link } from "wouter";
import { Briefcase, Home, Shield, ShieldCheck, Smartphone, Store, Wifi } from "lucide-react";
import { AuthGate } from "@/components/shared/role-gate";
import { LoginForm } from "@/components/auth/login-form";

const ROLE_PILLS = [
  { label: "Resident", Icon: Home },
  { label: "Admin", Icon: Briefcase },
  { label: "Security", Icon: Shield },
  { label: "Vendor", Icon: Store },
];

export default function LoginPage() {
  return (
    <AuthGate>
      <div className="kitenge-hero relative min-h-[100dvh] flex flex-col items-center justify-center px-4 py-8">
        <div className="relative w-full max-w-sm">
          {/* Brand mark */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center mb-3">
              <div className="relative">
                <img
                  src="/logo.svg"
                  alt="JiraniHub"
                  className="h-20 w-20 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
                  onError={(e) => {
                    const t = e.currentTarget;
                    t.style.display = "none";
                    const fb = t.nextElementSibling as HTMLElement;
                    if (fb) fb.style.display = "flex";
                  }}
                />
                <div
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#D4A017] to-[#B8860B] items-center justify-center shadow-xl"
                  style={{ display: "none" }}
                >
                  <span className="font-black text-3xl text-[#1B5E20]">JH</span>
                </div>
              </div>
            </div>
            <h1 className="font-black text-3xl text-white tracking-tight">JiraniHub</h1>
            <p className="text-white/70 text-xs mt-1 tracking-wide uppercase font-semibold">
              Smart Estate Management · Kenya
            </p>
          </div>

          {/* Card */}
          <div className="bg-[#F5F1E8] rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] overflow-hidden">
            <div className="maasai-stripe" />

            <div className="px-6 pt-6 pb-6">
              <div className="mb-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B5D45]">
                  Sign in
                </p>
                <h2 className="text-2xl font-black text-[#212121] mt-0.5">
                  Welcome back
                </h2>
                <p className="text-sm text-[#6B5D45] mt-1.5">
                  Use your Kenyan phone number to continue.
                </p>
              </div>

              <div className="mb-5 flex flex-wrap items-center gap-1.5">
                {ROLE_PILLS.map(({ label, Icon }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 rounded-full border border-[#D4C9A8] bg-white/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6B5D45]"
                  >
                    <Icon className="h-3 w-3 text-[#1B5E20]" />
                    {label}
                  </span>
                ))}
                <span className="text-[10px] font-semibold text-[#B0A080] ml-0.5">
                  one login
                </span>
              </div>

              <LoginForm />

              <div className="mt-6 flex items-center gap-3">
                <div className="flex-1 h-px bg-[#D4C9A8]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#B0A080]">
                  New here
                </span>
                <div className="flex-1 h-px bg-[#D4C9A8]" />
              </div>

              <Link
                href="/register"
                className="mt-4 w-full inline-flex items-center justify-center px-4 py-3 rounded-xl border border-[#D4C9A8] bg-white text-[#1B5E20] font-semibold text-sm hover:bg-[#EDE7D8] transition-colors min-h-[48px]"
              >
                Create a resident account
              </Link>
            </div>
          </div>

          {/* Trust signals */}
          <div className="mt-6 grid grid-cols-3 gap-2 text-white/80">
            <div className="flex flex-col items-center gap-1 text-[10px] font-semibold">
              <ShieldCheck className="h-4 w-4 text-[#D4A017]" />
              <span>Secure login</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-[10px] font-semibold">
              <Smartphone className="h-4 w-4 text-[#D4A017]" />
              <span>M-PESA ready</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-[10px] font-semibold">
              <Wifi className="h-4 w-4 text-[#D4A017]" />
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
