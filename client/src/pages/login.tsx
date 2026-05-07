import { Link } from "wouter";
import { AuthGate } from "@/components/shared/role-gate";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthGate>
      <div className="min-h-screen bg-gradient-to-br from-[#1A5C38] via-[#2A7A4E] to-[#1A5C38] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
              <span className="text-3xl">🏘️</span>
            </div>
            <h1 className="font-['Plus_Jakarta_Sans'] font-bold text-3xl text-white">
              JiraniHub
            </h1>
            <p className="text-white/70 text-sm mt-1">
              Smart Estate Management
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Welcome back</h2>
            <p className="text-sm text-gray-500 mb-6">Sign in with your Kenyan phone number</p>
            <LoginForm />
          </div>

          <p className="text-center text-sm text-white/70 mt-4">
            New resident?{" "}
            <Link href="/register" className="text-white font-medium underline">
              Create an account
            </Link>
          </p>

          {/* Footer */}
          <p className="text-center text-xs text-white/50 mt-4">
            © {new Date().getFullYear()} JiraniHub · Built for Kenya 🇰🇪
          </p>
        </div>
      </div>
    </AuthGate>
  );
}
