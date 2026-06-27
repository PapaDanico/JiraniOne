import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Check, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TopBar, BottomNav } from "@/components/shared/navigation";

const FEATURES = [
  { icon: "🚪", title: "Visitors", desc: "Digital QR check-in" },
  { icon: "🔧", title: "Maintenance", desc: "Ticket & workflow mgmt" },
  { icon: "💳", title: "M-PESA", desc: "Collect levies securely" },
  { icon: "📢", title: "Announcements", desc: "Broadcast with priority" },
  { icon: "🛒", title: "Marketplace", desc: "Vetted services" },
  { icon: "📅", title: "Events", desc: "Community calendar" },
  { icon: "🗳️", title: "Governance", desc: "Anonymous voting" },
  { icon: "🏢", title: "Facilities", desc: "Smart booking" },
  { icon: "🚨", title: "Emergency", desc: "GPS distress alerts" },
];

const BENEFITS = [
  "Stop WhatsApp chaos",
  "Full audit trail",
  "Secure payments",
  "Real-time updates",
  "SMS notifications",
  "Offline-first app",
];

const STATS = [
  { label: "Estates", value: "500+" },
  { label: "Residents", value: "50K+" },
  { label: "Payments", value: "5M+" },
];

export function LandingPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");

  return (
    <div className="page-wrap bg-white">
      <TopBar title="JiraniHub" />

      <main className="page-content">
        {/* Hero */}
        <section className="max-w-lg mx-auto px-4 pt-8 text-center space-y-4">
          <h1 className="font-black text-4xl text-[#212121]">
            Smart Estate Management
          </h1>
          <p className="text-base text-[#6B5D45]">
            Stop managing estates with WhatsApp and spreadsheets. JiraniHub brings order, security, and transparency to Kenyan communities.
          </p>
          <div className="flex gap-2 pt-4">
            <Button onClick={() => setLocation("/login")} className="flex-1">
              Get Started <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="secondary" onClick={() => setLocation("/login")} className="flex-1">
              Demo
            </Button>
          </div>
        </section>

        {/* Stats */}
        <section className="max-w-lg mx-auto px-4 pt-8 grid grid-cols-3 gap-2">
          {STATS.map((s, i) => (
            <div key={i} className="bg-[#1B5E20]/5 rounded-lg p-4 text-center">
              <p className="font-black text-xl text-[#1B5E20]">{s.value}</p>
              <p className="text-xs text-[#6B5D45]">{s.label}</p>
            </div>
          ))}
        </section>

        {/* Features */}
        <section className="max-w-lg mx-auto px-4 pt-12 space-y-3">
          <h2 className="font-black text-2xl text-[#212121] text-center mb-6">Everything You Need</h2>
          <div className="grid grid-cols-3 gap-2">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-[#F8F7F5] rounded-lg p-3 text-center border border-[#D4C9A8]">
                <p className="text-2xl mb-1">{f.icon}</p>
                <p className="font-bold text-xs text-[#212121]">{f.title}</p>
                <p className="text-xs text-[#6B5D45]">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section className="max-w-lg mx-auto px-4 pt-12 space-y-3">
          <h2 className="font-black text-2xl text-[#212121] text-center mb-6">Why JiraniHub?</h2>
          <div className="space-y-2">
            {BENEFITS.map((b, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-[#1B5E20]/5 rounded-lg border border-[#1B5E20]/10">
                <Check className="w-4 h-4 text-[#1B5E20] flex-shrink-0" />
                <span className="text-sm text-[#212121]">{b}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Security */}
        <section className="max-w-lg mx-auto px-4 pt-12 space-y-3">
          <div className="bg-[#1B5E20]/10 border border-[#1B5E20]/20 rounded-xl p-6 text-center space-y-3">
            <Shield className="w-8 h-8 text-[#1B5E20] mx-auto" />
            <h3 className="font-bold text-[#212121]">Your Data is Safe</h3>
            <ul className="text-xs text-[#6B5D45] space-y-1">
              <li>✓ End-to-end encryption</li>
              <li>✓ GDPR & Kenya DPA 2019 compliant</li>
              <li>✓ ISO 27001 secure</li>
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-lg mx-auto px-4 pt-12 pb-20 space-y-4 text-center">
          <h2 className="font-black text-2xl text-[#212121]">Ready to Simplify?</h2>
          <p className="text-sm text-[#6B5D45]">
            Start managing your estate smarter today.
          </p>
          <div className="space-y-2">
            <Button onClick={() => setLocation("/login")} className="w-full">
              Start Free Trial
            </Button>
            <input
              type="email"
              placeholder="your@estate.email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-[#D4C9A8] rounded-lg text-sm"
            />
            <p className="text-xs text-[#6B5D45]">Get product updates and tips</p>
          </div>
        </section>

        {/* Footer Links */}
        <section className="border-t border-[#D4C9A8] px-4 py-6 space-y-2 text-center text-xs">
          <p className="text-[#6B5D45]">© 2026 JiraniHub Ltd. Kenya</p>
          <div className="flex justify-center gap-4 text-[#1B5E20] font-semibold">
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="mailto:support@jiranihub.co.ke">Support</a>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
