import { useState } from "react";
import { useLocation } from "wouter";
import { Check, Lock, ShieldCheck, MapPin, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/shared/navigation";
import { RequestDemoDialog } from "./RequestDemoDialog";

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
  { text: "Secure M-PESA payments", icon: "🔒" },
  { text: "Live status updates", icon: "⚡" },
  { text: "SMS notifications", icon: "💬" },
  { text: "Built for 3G networks", icon: "📶" },
];

// Real, defensible numbers only — no invented adoption stats. This is a
// pre-launch product piloting with its first estate; a "500+ estates"
// counter would be a false claim the moment a prospect asked for a
// reference customer.
const STATS = [
  { label: "Core Modules", value: "9", color: "#1B5E20" },
  { label: "M-PESA Native", value: "100%", color: "#D47A00" },
  { label: "Emergency Response", value: "24/7", color: "#BB0000" },
];

export function LandingPage() {
  const [, setLocation] = useLocation();
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <div className="page-wrap min-h-screen bg-gradient-to-b from-white via-[#F8F7F5] to-white">
      {/* Public header — TopBar renders nothing for logged-out visitors, so
          the landing page (the first thing a prospect or investor sees) had
          no brand mark anywhere on it. This is the unauthenticated
          equivalent, styled to match. */}
      <header className="sticky top-0 z-40 bg-[#1B5E20] text-white">
        <div className="flex items-center gap-2.5 px-4 h-14 max-w-6xl mx-auto">
          <img src="/brand/logo-mark.webp" alt="JiraniHub" className="h-8 w-8 object-contain" />
          <span className="font-bold text-lg tracking-tight font-display">JiraniHub</span>
        </div>
      </header>

      <main className="page-content">
        {/* Hero */}
        <section className="max-w-lg mx-auto px-4 pt-12 pb-8 text-center space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1B5E20]/10 rounded-full border border-[#1B5E20]/20">
              <MapPin className="w-3 h-3 text-[#1B5E20]" />
              <span className="text-xs font-semibold text-[#1B5E20]">
                Now onboarding gated communities across Kenya
              </span>
            </div>
            <h1 className="font-black text-5xl leading-tight text-[#212121]">
              Run Your Estate.<br />Not a WhatsApp Group.
            </h1>
            <p className="text-lg text-[#6B5D45] leading-relaxed">
              JiraniHub replaces the WhatsApp groups, paper logbooks, and spreadsheets most Kenyan estates run on today with one platform for visitor security, maintenance, M-PESA levy collection, governance, and emergencies — built for estate management companies, residents' associations, and property developers.
            </p>
            <p className="text-sm italic text-[#D47A00] font-medium">
              "Jirani mwema ni hazina" — a good neighbour is a treasure.
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-4">
            <Button onClick={() => setDemoOpen(true)} className="w-full h-14 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
              <Building2 className="w-5 h-5 mr-2" /> Bring JiraniHub to Your Estate
            </Button>
            <Button
              variant="secondary"
              onClick={() => setLocation("/login")}
              className="w-full h-14 text-base font-semibold rounded-xl border-2 hover:bg-[#1B5E20]/5 transition-all duration-300"
            >
              Sign In
            </Button>
            <Button
              variant="link"
              onClick={() => setLocation("/register")}
              className="text-sm text-[#6B5D45] hover:text-[#1B5E20]"
            >
              Already a resident of a JiraniHub estate? Create your account →
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

        {/* How it works - 3 steps */}
        <section className="max-w-lg mx-auto px-4 pb-12 space-y-5">
          <div className="text-center space-y-2">
            <h2 className="font-black text-3xl text-[#212121]">How It Works</h2>
            <p className="text-sm text-[#6B5D45]">From WhatsApp chaos to calm, in three steps</p>
          </div>
          <div className="space-y-3">
            {[
              { n: "1", title: "Your estate joins", desc: "Management sets up the estate, adds facilities and rules, and invites every household." },
              { n: "2", title: "You sign in with your phone number", desc: "No email needed. Invite visitors, report issues, book the clubhouse, and follow estate news — all from one app." },
              { n: "3", title: "Pay and track with M-PESA", desc: "Levy prompts land on your phone. Every shilling is receipted and visible — full transparency for the whole community." },
            ].map((s) => (
              <div key={s.n} className="flex items-start gap-4 bg-white rounded-2xl p-4 border border-[#E8E3D8] shadow-sm">
                <div className="w-9 h-9 rounded-full bg-[#1B5E20] text-white font-black flex items-center justify-center shrink-0">
                  {s.n}
                </div>
                <div>
                  <p className="font-bold text-sm text-[#212121]">{s.title}</p>
                  <p className="text-sm text-[#6B5D45] mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Who it's for - target buyers */}
        <section className="max-w-lg mx-auto px-4 pb-12 space-y-5">
          <div className="text-center space-y-2">
            <h2 className="font-black text-3xl text-[#212121]">Built For</h2>
            <p className="text-sm text-[#6B5D45]">Whoever runs the estate day-to-day</p>
          </div>
          <div className="space-y-3">
            {[
              { icon: "🏘️", title: "Estate Management Companies", desc: "Run every property you manage from one dashboard — levies, tickets, gate logs, and reports, per estate." },
              { icon: "🤝", title: "Residents' Associations & Committees", desc: "Replace the group-admin burden of chasing payments and forwarding notices with transparent, auditable tools." },
              { icon: "🏗️", title: "Property Developers", desc: "Hand new estates a working management system from day one of occupation, not a WhatsApp group and a spreadsheet." },
            ].map((a) => (
              <div key={a.title} className="flex items-start gap-4 bg-white rounded-2xl p-4 border border-[#E8E3D8] shadow-sm">
                <div className="text-2xl shrink-0">{a.icon}</div>
                <div>
                  <p className="font-bold text-sm text-[#212121]">{a.title}</p>
                  <p className="text-sm text-[#6B5D45] mt-0.5 leading-relaxed">{a.desc}</p>
                </div>
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
              <ShieldCheck className="w-12 h-12 mx-auto" />
              <h3 className="font-black text-2xl">Your Data is Safe</h3>
              <ul className="text-sm space-y-2 font-medium text-left max-w-xs mx-auto">
                <li className="flex items-start gap-2">
                  <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>HTTPS everywhere, hashed passwords, session-based auth</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Built with Kenya's Data Protection Act (2019) in mind — visitor records are automatically anonymized after 90 days</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Role-based access and a full audit trail on every sensitive action</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA - Modern Form */}
        <section className="max-w-lg mx-auto px-4 pb-20 space-y-6">
          <div className="text-center space-y-3">
            <h2 className="font-black text-3xl text-[#212121]">Be Among the First</h2>
            <p className="text-base text-[#6B5D45]">
              We're bringing modern estate management to Kenya one community at a time. Get in touch to bring JiraniHub to your estate.
            </p>
          </div>
          <div className="space-y-3 bg-white rounded-2xl p-6 border border-[#E8E3D8] shadow-md">
            <Button onClick={() => setDemoOpen(true)} className="w-full h-13 text-base font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
              <Building2 className="w-5 h-5 mr-2" /> Request a Walkthrough
            </Button>
            <p className="text-xs text-[#6B5D45] text-center font-medium">
              Prefer email? Reach us at{" "}
              <a href="mailto:support@jiranihub.co.ke" className="text-[#1B5E20] underline">support@jiranihub.co.ke</a>
            </p>
            <div className="flex items-center justify-center gap-1 pt-1">
              <Button variant="link" size="sm" onClick={() => setLocation("/login")} className="text-xs">
                Sign In
              </Button>
              <span className="text-[#D4C9A8]">•</span>
              <Button variant="link" size="sm" onClick={() => setLocation("/register")} className="text-xs">
                Resident? Create your account
              </Button>
            </div>
          </div>
        </section>

        {/* Footer Links */}
        <section className="border-t border-[#E8E3D8] px-4 py-8 space-y-4 text-center">
          <p className="text-xs font-semibold text-[#6B5D45]">© 2026 JiraniHub Ltd. Kenya</p>
          <div className="flex justify-center gap-4 text-xs font-semibold flex-wrap">
            <a href="/faq" className="text-[#1B5E20] hover:underline hover:opacity-80 transition-all">Help & FAQ</a>
            <span className="text-[#D4C9A8]">•</span>
            <a href="/privacy" className="text-[#1B5E20] hover:underline hover:opacity-80 transition-all">Privacy</a>
            <span className="text-[#D4C9A8]">•</span>
            <a href="/terms" className="text-[#1B5E20] hover:underline hover:opacity-80 transition-all">Terms</a>
            <span className="text-[#D4C9A8]">•</span>
            <a href="mailto:support@jiranihub.co.ke" className="text-[#1B5E20] hover:underline hover:opacity-80 transition-all">Support</a>
          </div>
        </section>
      </main>

      <RequestDemoDialog open={demoOpen} onClose={() => setDemoOpen(false)} />

      <BottomNav />
    </div>
  );
}
