import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Check, Shield, Zap } from "lucide-react";
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
  { text: "Stop WhatsApp chaos", icon: "📱" },
  { text: "Full audit trail", icon: "📊" },
  { text: "Secure payments", icon: "🔒" },
  { text: "Real-time updates", icon: "⚡" },
  { text: "SMS notifications", icon: "💬" },
  { text: "Offline-first app", icon: "📡" },
];

const STATS = [
  { label: "Estates", value: "500+", color: "#1B5E20" },
  { label: "Residents", value: "50K+", color: "#D47A00" },
  { label: "Payments", value: "5M+", color: "#BB0000" },
];

export function LandingPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  return (
    <div className="page-wrap min-h-screen bg-gradient-to-b from-white via-[#F8F7F5] to-white">
      <TopBar title="JiraniHub" />

      <main className="page-content">
        {/* Hero */}
        <section className="max-w-lg mx-auto px-4 pt-12 pb-8 text-center space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1B5E20]/10 rounded-full border border-[#1B5E20]/20">
              <Zap className="w-3 h-3 text-[#1B5E20]" />
              <span className="text-xs font-semibold text-[#1B5E20]">New: AI-powered analytics</span>
            </div>
            <h1 className="font-black text-5xl leading-tight text-[#212121]">
              Smart Estate<br />Management
            </h1>
            <p className="text-lg text-[#6B5D45] leading-relaxed">
              Stop managing estates with WhatsApp and spreadsheets. JiraniHub brings order, security, and transparency to Kenyan communities.
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-4">
            <Button onClick={() => setLocation("/login")} className="w-full h-14 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
              Get Started <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              variant="secondary"
              onClick={() => setLocation("/login")}
              className="w-full h-14 text-base font-semibold rounded-xl border-2 hover:bg-[#1B5E20]/5 transition-all duration-300"
            >
              Watch Demo
            </Button>
          </div>
        </section>

        {/* Stats - Modern Grid */}
        <section className="max-w-lg mx-auto px-4 py-8">
          <div className="grid grid-cols-3 gap-3">
            {STATS.map((s, i) => (
              <div
                key={i}
                className="group relative overflow-hidden bg-white rounded-2xl p-4 border border-[#E8E3D8] shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white to-[#F8F7F5] group-hover:opacity-100 opacity-0 transition-opacity duration-300" />
                <div className="relative text-center space-y-2">
                  <p className="font-black text-2xl" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs font-semibold text-[#6B5D45]">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features - Interactive Cards */}
        <section className="max-w-lg mx-auto px-4 pt-12 pb-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-black text-3xl text-[#212121]">Everything You Need</h2>
            <p className="text-sm text-[#6B5D45]">9 core modules designed for Kenyan estates</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
                className="landing-card group relative bg-white rounded-xl p-4 border border-[#E8E3D8] shadow-sm hover:shadow-lg hover:-translate-y-2 transition-all duration-300 cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#1B5E20]/5 to-[#D47A00]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                <div className="relative space-y-2 text-center">
                  <p className="text-3xl group-hover:scale-125 transition-transform duration-300">{f.icon}</p>
                  <p className="font-bold text-sm text-[#212121]">{f.title}</p>
                  <p className="text-xs text-[#6B5D45] leading-snug">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits - Enhanced List */}
        <section className="max-w-lg mx-auto px-4 pt-8 pb-12 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="font-black text-3xl text-[#212121]">Why JiraniHub?</h2>
            <p className="text-sm text-[#6B5D45]">Built specifically for Kenyan community estates</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {BENEFITS.map((b, i) => (
              <div
                key={i}
                className="group flex flex-col items-center gap-3 p-4 bg-white rounded-xl border border-[#E8E3D8] shadow-sm hover:shadow-md hover:border-[#1B5E20]/30 transition-all duration-300"
              >
                <div className="text-3xl group-hover:scale-110 transition-transform duration-300">{b.icon}</div>
                <span className="text-sm font-semibold text-[#212121] text-center">{b.text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Security - Premium Card */}
        <section className="max-w-lg mx-auto px-4 pb-12">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#1B5E20] via-[#0F4D2A] to-[#1B5E20] rounded-3xl p-8 text-center text-white shadow-xl">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#D47A00] rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#D47A00] rounded-full blur-3xl" />
            </div>
            <div className="relative space-y-4">
              <Shield className="w-12 h-12 mx-auto" />
              <h3 className="font-black text-2xl">Your Data is Safe</h3>
              <ul className="text-sm space-y-2 font-medium">
                <li>✓ End-to-end encryption</li>
                <li>✓ GDPR & Kenya DPA 2019 compliant</li>
                <li>✓ ISO 27001 certified</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA - Modern Form */}
        <section className="max-w-lg mx-auto px-4 pb-20 space-y-6">
          <div className="text-center space-y-3">
            <h2 className="font-black text-3xl text-[#212121]">Ready to Simplify?</h2>
            <p className="text-base text-[#6B5D45]">Join 500+ estates managing their communities smarter.</p>
          </div>
          <div className="space-y-3 bg-white rounded-2xl p-6 border border-[#E8E3D8] shadow-md">
            <Button onClick={() => setLocation("/login")} className="w-full h-13 text-base font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
              Start Free Trial
            </Button>
            <div className="relative">
              <input
                type="email"
                placeholder="your@estate.email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-[#E8E3D8] rounded-xl text-sm focus:border-[#1B5E20] focus:outline-none focus:ring-2 focus:ring-[#1B5E20]/20 transition-all duration-300"
              />
            </div>
            <p className="text-xs text-[#6B5D45] text-center font-medium">Get product updates and exclusive tips</p>
          </div>
        </section>

        {/* Footer Links */}
        <section className="border-t border-[#E8E3D8] px-4 py-8 space-y-4 text-center">
          <p className="text-xs font-semibold text-[#6B5D45]">© 2026 JiraniHub Ltd. Kenya</p>
          <div className="flex justify-center gap-6 text-xs font-semibold">
            <a href="/privacy" className="text-[#1B5E20] hover:underline hover:opacity-80 transition-all">Privacy</a>
            <span className="text-[#D4C9A8]">•</span>
            <a href="/terms" className="text-[#1B5E20] hover:underline hover:opacity-80 transition-all">Terms</a>
            <span className="text-[#D4C9A8]">•</span>
            <a href="mailto:support@jiranihub.co.ke" className="text-[#1B5E20] hover:underline hover:opacity-80 transition-all">Support</a>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
