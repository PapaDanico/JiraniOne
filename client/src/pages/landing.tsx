import { Link } from "wouter";
import {
  Shield, Wrench, CreditCard, Bell, Users, Smartphone,
  ChevronRight, Star, MapPin,
} from "lucide-react";

const features = [
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Visitor Management",
    desc: "QR-coded visitor passes, gate logs, and real-time check-in alerts.",
    color: "bg-[#1B5E20]/10 text-[#1B5E20]",
  },
  {
    icon: <Wrench className="h-6 w-6" />,
    title: "Maintenance Tickets",
    desc: "Submit, track, and resolve estate issues with photo evidence and audit trails.",
    color: "bg-[#D47A00]/10 text-[#D47A00]",
  },
  {
    icon: <CreditCard className="h-6 w-6" />,
    title: "M-PESA Payments",
    desc: "Levy collection, Harambee fundraising, and instant receipts via Safaricom.",
    color: "bg-[#D4A017]/15 text-[#9A6E00]",
  },
  {
    icon: <Bell className="h-6 w-6" />,
    title: "Announcements & SMS",
    desc: "Broadcast to residents in-app or via SMS. Works on 2G/3G Kenyan networks.",
    color: "bg-purple-100 text-purple-700",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Governance & Polls",
    desc: "Polls, committee transparency, estate minutes, and AGM coordination.",
    color: "bg-[#B71C1C]/10 text-[#B71C1C]",
  },
  {
    icon: <Smartphone className="h-6 w-6" />,
    title: "Offline-First",
    desc: "Critical features work without data. Built and tested for Kenyan networks.",
    color: "bg-teal-100 text-teal-700",
  },
];

const tiers = [
  {
    name: "Starter",
    price: "KES 4,000",
    units: "Up to 20 units",
    features: ["Visitor management", "Maintenance tickets", "Announcements"],
  },
  {
    name: "Growth",
    price: "KES 9,500",
    units: "21–100 units",
    features: ["Everything in Starter", "M-PESA payments", "Marketplace", "Events & bookings"],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Contact us",
    units: "100+ units",
    features: ["Everything in Growth", "Custom integrations", "Dedicated support"],
  },
];

const testimonials = [
  {
    quote: "JiraniHub has transformed how we manage our estate. Visitor access is now seamless.",
    name: "Wanjiku M.",
    role: "Admin, Westlands Estate",
    initials: "WM",
  },
  {
    quote: "Paying my monthly levy via M-PESA directly in the app is incredibly convenient.",
    name: "Kamau O.",
    role: "Resident, Kilimani Gardens",
    initials: "KO",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-[#F5F1E8]/95 backdrop-blur border-b border-[#D4C9A8] px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#1B5E20] flex items-center justify-center">
              <span className="text-[#D4A017] font-bold text-sm">JH</span>
            </div>
            <span className="font-bold text-xl text-[#1B5E20]">JiraniHub</span>
          </div>
          <Link
            href="/login"
            className="btn-primary text-sm px-4 py-2 rounded-xl min-h-0"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Maasai stripe */}
      <div className="maasai-stripe" />

      {/* Hero */}
      <section className="kitenge-hero text-white px-4 py-20 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#D4A017]/20 border border-[#D4A017]/30 rounded-full px-4 py-1.5 text-sm mb-6 text-[#D4A017] font-medium">
            <MapPin className="h-3.5 w-3.5" />
            🇰🇪 Built for Kenyan Estates
          </div>
          <h1 className="font-bold text-4xl md:text-5xl leading-tight mb-5 tracking-tight">
            Ditch the WhatsApp Group.<br />
            <span className="text-[#D4A017]">Manage Your Estate Properly.</span>
          </h1>
          <p className="text-white/75 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
            JiraniHub is a digital estate management platform for Kenyan gated communities —
            visitors, maintenance, M-PESA, and more.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-[#D4A017] hover:bg-[#B8860B] text-white font-bold px-8 py-3.5 rounded-xl text-base transition-colors"
            >
              Get Started Free <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 border border-white/30 text-white hover:bg-white/10 font-medium px-8 py-3.5 rounded-xl text-base transition-colors"
            >
              View Demo
            </Link>
          </div>
          <p className="text-white/40 text-sm mt-4">No credit card required. Billed via M-PESA.</p>
        </div>
      </section>

      {/* Maasai stripe */}
      <div className="maasai-stripe" />

      {/* Features */}
      <section className="px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="section-label mb-2">Features</p>
            <h2 className="tribal-heading text-3xl">Everything your estate needs</h2>
            <p className="text-[#6B5D45] mt-2">9 integrated modules. One platform.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.title} className="tribal-card p-5 hover:shadow-md transition-shadow">
                <div className={`w-11 h-11 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-[#212121] mb-1.5">{f.title}</h3>
                <p className="text-sm text-[#6B5D45] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-[#EDE7D8] px-4 py-12 border-y border-[#D4C9A8]">
        <div className="max-w-3xl mx-auto">
          <p className="section-label text-center mb-8">What residents say</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-[#F5F1E8] rounded-2xl p-5 border border-[#D4C9A8]">
                <div className="flex gap-0.5 mb-3">
                  {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-[#D4A017] text-[#D4A017]" />)}
                </div>
                <p className="text-[#212121] text-sm italic leading-relaxed mb-4">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1B5E20] flex items-center justify-center">
                    <span className="text-white font-bold text-xs">{t.initials}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-[#212121]">{t.name}</p>
                    <p className="text-xs text-[#6B5D45]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="section-label mb-2">Pricing</p>
            <h2 className="tribal-heading text-3xl">Transparent pricing, no surprises</h2>
            <p className="text-[#6B5D45] mt-2">Per estate, per month. Cancel anytime.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={`rounded-2xl border p-6 ${
                  t.highlight
                    ? "border-[#1B5E20] bg-[#1B5E20] text-white shadow-xl"
                    : "border-[#D4C9A8] bg-[#EDE7D8]"
                }`}
              >
                {t.highlight && (
                  <span className="text-xs bg-[#D4A017] text-white px-3 py-0.5 rounded-full mb-3 inline-block font-semibold">
                    Most Popular
                  </span>
                )}
                <div className="text-2xl font-bold mb-0.5">{t.price}</div>
                <div className={`text-sm mb-1 ${t.highlight ? "text-white/60" : "text-[#6B5D45]"}`}>/month</div>
                <div className={`font-bold text-xl mb-3 ${t.highlight ? "" : "text-[#212121]"}`}>{t.name}</div>
                <div className={`text-sm mb-5 ${t.highlight ? "text-white/60" : "text-[#6B5D45]"}`}>{t.units}</div>
                <ul className="space-y-2.5">
                  {t.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${t.highlight ? "text-white/90" : "text-[#212121]"}`}>
                      <span className={`text-base ${t.highlight ? "text-[#D4A017]" : "text-[#1B5E20]"}`}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`mt-6 block text-center rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                    t.highlight
                      ? "bg-[#D4A017] text-white hover:bg-[#B8860B]"
                      : "border border-[#D4C9A8] text-[#1B5E20] hover:bg-[#D4C9A8]/50"
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="kitenge-hero px-4 py-14 text-center relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="font-bold text-3xl text-white mb-4">
            Ready to upgrade your estate?
          </h2>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-[#D4A017] hover:bg-[#B8860B] text-white font-bold px-10 py-4 rounded-xl text-base transition-colors"
          >
            Start Free Trial <ChevronRight className="h-4 w-4" />
          </Link>
          <p className="text-white/40 text-sm mt-4">No credit card required.</p>
        </div>
      </section>

      <div className="maasai-stripe" />

      <footer className="px-4 py-8 text-center bg-[#EDE7D8] border-t border-[#D4C9A8]">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-[#1B5E20] flex items-center justify-center">
            <span className="text-[#D4A017] font-bold text-xs">JH</span>
          </div>
          <span className="font-bold text-[#1B5E20]">JiraniHub</span>
        </div>
        <p className="text-xs text-[#6B5D45]">
          © {new Date().getFullYear()} JiraniHub · Nairobi, Kenya · Your Digital Neighbour
        </p>
      </footer>
    </div>
  );
}
