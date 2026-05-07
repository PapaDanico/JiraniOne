import { Link } from "wouter";
import { AuthGate } from "@/components/shared/role-gate";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthGate>
      <div className="kitenge-hero min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img
                src="/logo.svg"
                alt="JiraniHub"
                className="h-24 w-24 object-contain drop-shadow-xl"
                onError={(e) => {
                  const t = e.currentTarget;
                  t.style.display = "none";
                  const fb = t.nextElementSibling as HTMLElement;
                  if (fb) fb.style.removeProperty("display");
                }}
              />
              <div
                className="w-20 h-20 rounded-2xl bg-white/15 items-center justify-center"
                style={{ display: "none" }}
              >
                <span className="font-black text-3xl text-[#D4A017]">JH</span>
              </div>
            </div>
            <h1 className="font-black text-3xl text-white tracking-tight">JiraniHub</h1>
            <p className="text-white/60 text-sm mt-1">Smart Estate Management · Kenya</p>
          </div>

          {/* Card */}
          <div className="bg-[#F5F1E8] rounded-2xl shadow-2xl p-6">
            <div className="maasai-stripe rounded-full mb-5" />
            <h2 className="text-lg font-bold text-[#212121] mb-1">Welcome back</h2>
            <p className="text-sm text-[#6B5D45] mb-6">Sign in with your Kenyan phone number</p>
            <LoginForm />
          </div>

          <p className="text-center text-sm text-white/70 mt-4">
            New resident?{" "}
            <Link href="/register" className="text-[#D4A017] font-bold underline">
              Create account
            </Link>
          </p>

          <p className="text-center text-xs text-white/40 mt-4">
            © {new Date().getFullYear()} JiraniHub · Built for Kenya 🇰🇪
          </p>
        </div>
      </div>
    </AuthGate>
  );
}
