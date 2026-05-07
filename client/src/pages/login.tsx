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
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 mb-4">
              <span className="font-black text-2xl text-[#D4A017]">JH</span>
            </div>
            <h1 className="font-black text-3xl text-white tracking-tight">JiraniHub</h1>
            <p className="text-white/60 text-sm mt-1">Usimamizi wa Makazi Kenya</p>
          </div>

          {/* Card */}
          <div className="bg-[#F5F1E8] rounded-2xl shadow-2xl p-6">
            <div className="maasai-stripe rounded-full mb-4" />
            <h2 className="text-lg font-bold text-[#212121] mb-1">Karibu tena</h2>
            <p className="text-sm text-[#6B5D45] mb-6">Ingia kwa nambari yako ya simu</p>
            <LoginForm />
          </div>

          <p className="text-center text-sm text-white/70 mt-4">
            Mkazi mpya?{" "}
            <Link href="/register" className="text-[#D4A017] font-bold underline">
              Fungua akaunti
            </Link>
          </p>

          <p className="text-center text-xs text-white/40 mt-4">
            © {new Date().getFullYear()} JiraniHub · Imetengenezwa Kenya 🇰🇪
          </p>
        </div>
      </div>
    </AuthGate>
  );
}
