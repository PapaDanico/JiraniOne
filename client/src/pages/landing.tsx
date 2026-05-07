import { Link } from "wouter";
import { Shield, Wrench, Smartphone, Users, CreditCard, Bell } from "lucide-react";

const features = [
  {
    icon: <Shield className="h-6 w-6 text-[#1A5C38]" />,
    title: "Visitor Management",
    desc: "QR-coded visitor passes, gate logs, and real-time check-in alerts.",
  },
  {
    icon: <Wrench className="h-6 w-6 text-[#1A5C38]" />,
    title: "Maintenance Ticketing",
    desc: "Submit, track, and resolve estate issues with full audit trails.",
  },
  {
    icon: <CreditCard className="h-6 w-6 text-[#1A5C38]" />,
    title: "M-PESA Payments",
    desc: "Levy collection, fundraising, and receipts — all via Safaricom.",
  },
  {
    icon: <Bell className="h-6 w-6 text-[#1A5C38]" />,
    title: "Announcements & SMS",
    desc: "Broadcast to residents in-app or via SMS. Works on 3G.",
  },
  {
    icon: <Users className="h-6 w-6 text-[#1A5C38]" />,
    title: "Governance & Voting",
    desc: "Polls, committee transparency, and meeting minutes archive.",
  },
  {
    icon: <Smartphone className="h-6 w-6 text-[#1A5C38]" />,
    title: "Offline-First",
    desc: "Critical features work without data. Built for Kenyan networks.",
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
    features: [
      "Everything in Starter",
      "M-PESA payments",
      "Marketplace",
      "Events & bookings",
    ],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    units: "100+ units",
    features: ["Everything in Growth", "Custom integrations", "Dedicated support"],
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-['Plus_Jakarta_Sans'] font-bold text-xl text-[#1A5C38]">
            JiraniHub
          </span>
          <Link
            href="/login"
            className="btn-primary text-sm px-4 py-2 rounded-lg"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1A5C38] to-[#0F3C24] text-white px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 text-sm mb-6">
            🇰🇪 Built for Kenyan Estates
          </div>
          <h1 className="font-['Plus_Jakarta_Sans'] font-bold text-4xl md:text-5xl leading-tight mb-4">
            Replace the WhatsApp Group.<br />
            Manage Your Estate Properly.
          </h1>
          <p className="text-white/80 text-lg mb-8 max-w-lg mx-auto">
            JiraniHub is the digital backbone for Kenyan gated communities — visitor management,
            maintenance tickets, M-PESA payments, and more.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-[#D47A00] hover:bg-[#A05800] text-white font-semibold px-8 py-3 rounded-xl text-base transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-['Plus_Jakarta_Sans'] font-bold text-2xl text-center text-gray-900 mb-2">
            Everything your estate needs
          </h2>
          <p className="text-gray-500 text-center mb-10">
            9 integrated modules. One platform.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.title} className="card p-5">
                <div className="w-10 h-10 rounded-xl bg-[#1A5C38]/10 flex items-center justify-center mb-3">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-[#F8F7F5] px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-['Plus_Jakarta_Sans'] font-bold text-2xl text-center text-gray-900 mb-2">
            Simple, transparent pricing
          </h2>
          <p className="text-gray-500 text-center mb-10">Per estate, per month. Cancel any time.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={`rounded-2xl border p-6 ${
                  t.highlight
                    ? "border-[#1A5C38] bg-[#1A5C38] text-white shadow-lg"
                    : "border-[#E8E6E3] bg-white"
                }`}
              >
                {t.highlight && (
                  <span className="text-xs bg-[#D47A00] text-white px-2 py-0.5 rounded-full mb-3 inline-block">
                    Most Popular
                  </span>
                )}
                <div className="text-2xl font-bold mb-0.5">{t.price}</div>
                <div className={`text-sm mb-1 ${t.highlight ? "text-white/70" : "text-gray-500"}`}>
                  /month
                </div>
                <div className={`font-semibold text-lg mb-4 ${t.highlight ? "" : "text-gray-900"}`}>
                  {t.name}
                </div>
                <div className={`text-sm mb-4 ${t.highlight ? "text-white/70" : "text-gray-500"}`}>
                  {t.units}
                </div>
                <ul className="space-y-2">
                  {t.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${t.highlight ? "text-white/90" : "text-gray-700"}`}>
                      <span>✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-12 text-center">
        <h2 className="font-['Plus_Jakarta_Sans'] font-bold text-2xl text-gray-900 mb-3">
          Ready to modernise your estate?
        </h2>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-[#1A5C38] hover:bg-[#0F3C24] text-white font-semibold px-8 py-3 rounded-xl text-base transition-colors"
        >
          Start Free Trial
        </Link>
        <p className="text-gray-400 text-sm mt-3">No credit card required. M-PESA billing available.</p>
      </section>

      <footer className="border-t border-gray-100 px-4 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} JiraniHub · Nairobi, Kenya · Built for Kenyan estates
      </footer>
    </div>
  );
}
