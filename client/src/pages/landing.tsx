import { Link } from "wouter";
import {
  Shield, Wrench, CreditCard, Bell, Users, Smartphone,
  ChevronRight, Star, MapPin, Home as HomeIcon, Briefcase, Store as StoreIcon,
  Check,
} from "lucide-react";

// ─── Content ─────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    Icon: Shield,
    title: "Visitor Management",
    desc: "QR-coded passes, gate logs, real-time check-in alerts to the resident's phone.",
    tone: "green",
  },
  {
    Icon: Wrench,
    title: "Maintenance Tickets",
    desc: "Photos, categories, priorities. Estate admin assigns, vendor responds, you see the status.",
    tone: "amber",
  },
  {
    Icon: CreditCard,
    title: "M-PESA Payments",
    desc: "Service charge, harambee, marketplace — STK Push to Safaricom, receipts auto-archived.",
    tone: "gold",
  },
  {
    Icon: Bell,
    title: "Announcements & SMS",
    desc: "Broadcast to residents in-app. SMS fallback so it reaches every member, even on 2G.",
    tone: "red",
  },
  {
    Icon: Users,
    title: "Governance & Polls",
    desc: "AGM coordination, anonymous voting on sensitive matters, transparent committee minutes.",
    tone: "green",
  },
  {
    Icon: Smartphone,
    title: "Offline-First",
    desc: "Visitor passes and emergency alerts cache locally. Built for outages and 3G dead-zones.",
    tone: "amber",
  },
] as const;

const TONE_BG: Record<string, string> = {
  green: "bg-brand-green/10 text-brand-green",
  amber: "bg-brand-amber/10 text-brand-amber",
  gold:  "bg-brand-gold/15 text-brand-gold-dark",
  red:   "bg-brand-red/10 text-brand-red",
};

const ROLES = [
  {
    Icon: HomeIcon,
    label: "Resident",
    chip: "Most common",
    desc: "Invite visitors, log issues, pay your levy, stay on top of estate notices — from your phone.",
    iconBg: "bg-brand-green",
    iconFg: "text-brand-gold",
    chipClass: "bg-brand-green/10 text-brand-green",
  },
  {
    Icon: Briefcase,
    label: "Admin",
    chip: "Estate manager",
    desc: "Every ticket, every payment, every poll, every resident — with reports and an audit trail.",
    iconBg: "bg-brand-gold-dark",
    iconFg: "text-white",
    chipClass: "bg-brand-gold/15 text-brand-gold-dark",
  },
  {
    Icon: Shield,
    label: "Security",
    chip: "Gate officer",
    desc: "Scan visitor QR at the gate, run the gate log, respond to emergency alerts in real time.",
    iconBg: "bg-brand-red",
    iconFg: "text-white",
    chipClass: "bg-brand-red/10 text-brand-red",
  },
  {
    Icon: StoreIcon,
    label: "Vendor",
    chip: "Service provider",
    desc: "List your service in the estate marketplace — plumbing, electricals, cleaning, tutoring, food.",
    iconBg: "bg-purple-600",
    iconFg: "text-white",
    chipClass: "bg-purple-100 text-purple-800",
  },
];

const TIERS = [
  {
    name: "Starter",
    price: "KES 4,000",
    units: "Up to 20 units",
    features: ["Visitor management", "Maintenance tickets", "Announcements", "SMS notifications"],
  },
  {
    name: "Growth",
    price: "KES 9,500",
    units: "21–100 units",
    features: [
      "Everything in Starter",
      "M-PESA payments",
      "Marketplace + Bookings",
      "Events & governance",
    ],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Contact us",
    units: "100+ units",
    features: ["Everything in Growth", "Custom integrations", "Dedicated support", "Multi-estate console"],
  },
];

const TESTIMONIALS = [
  {
    quote:
      "JiraniHub replaced our WhatsApp group, the visitor's logbook and the levy spreadsheet in one go. Our gate is sane now.",
    name: "Wanjiku M.",
    role: "Admin · Westlands Estate",
    initials: "WM",
  },
  {
    quote:
      "Paying my service charge via M-PESA in the app, with the receipt arriving by SMS, beats the bank queue every month.",
    name: "Kamau O.",
    role: "Resident · Kilimani Gardens",
    initials: "KO",
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-tribal-cream">
      {/* Top nav */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-tribal-border shadow-sm">
        <div className="container-wide flex items-center justify-between py-2">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/logo-horizontal.svg" alt="JiraniHub" className="h-14" />
          </Link>
          <Link href="/login" className="btn-primary px-6 py-2.5 min-h-[44px] text-sm font-semibold">
            Sign In
          </Link>
        </div>
      </nav>

      <div className="maasai-stripe" />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="kitenge-hero relative overflow-hidden">
        <div className="ring-deco relative z-10 container-wide py-20 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-brand-gold/20 border border-brand-gold/30 rounded-full px-4 py-1.5 text-sm mb-6 text-brand-gold font-semibold">
            <MapPin className="h-3.5 w-3.5" />
            Built for Kenyan Estates
          </div>
          <h1 className="font-display font-extrabold text-4xl md:text-6xl leading-tight tracking-tight text-white mb-3">
            Ditch the WhatsApp group.
          </h1>
          <p className="font-serif italic text-2xl md:text-3xl text-brand-gold mb-6">
            Manage your estate properly.
          </p>
          <p className="text-white/75 text-base md:text-lg max-w-xl mx-auto leading-relaxed mb-10">
            JiraniHub is the digital infrastructure layer that replaces paper logbooks,
            verbal announcements and the family WhatsApp group running your estate today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-brand-gold hover:bg-brand-gold-dark text-white font-bold px-8 py-3.5 rounded-xl text-base transition-all duration-200 min-h-[48px] hover:shadow-lg hover:scale-105 active:scale-95"
            >
              Get Started Free <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 border-2 border-white text-white hover:bg-white/20 font-semibold px-8 py-3.5 rounded-xl text-base transition-all duration-200 min-h-[48px] hover:shadow-lg"
            >
              Try the Demo
            </Link>
          </div>
          <p className="text-white/40 text-xs mt-5">
            No credit card required &middot; Billed via M-PESA &middot; Cancel anytime
          </p>
        </div>
      </section>

      <div className="maasai-stripe" />

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="container-wide py-16">
        <div className="text-center mb-10">
          <p className="section-label mb-2">Features</p>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-tribal-charcoal mb-2">
            Nine modules. <span className="font-serif italic text-brand-green">One platform.</span>
          </h2>
          <p className="text-tribal-earth text-sm max-w-md mx-auto">
            Every piece a Kenyan estate needs — without the bolt-on integrations.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="tribal-card p-6 hover:shadow-card-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
            >
              <div className={`w-12 h-12 rounded-xl ${TONE_BG[f.tone]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <f.Icon className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold text-tribal-charcoal mb-2 text-lg">{f.title}</h3>
              <p className="text-sm text-tribal-earth leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="maasai-stripe" />

      {/* ── Who it's for ─────────────────────────────────────────────── */}
      <section className="container-wide py-16 bg-tribal-cream-dark/40">
        <div className="text-center mb-10">
          <p className="section-label mb-2">Who it's for</p>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-tribal-charcoal mb-2">
            Four roles. <span className="font-serif italic text-brand-green">One sign-in.</span>
          </h2>
          <p className="text-tribal-earth text-sm max-w-lg mx-auto">
            What you see after you sign in depends on the role your estate admin assigned to you.
            Same login, different dashboard.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {ROLES.map((r) => (
            <div
              key={r.label}
              className="tribal-card p-6 flex flex-col gap-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${r.iconBg} group-hover:scale-110 transition-transform`}>
                  <r.Icon className={`h-6 w-6 ${r.iconFg}`} />
                </div>
                <div>
                  <p className="font-display font-bold text-tribal-charcoal text-base">{r.label}</p>
                  <span className={`inline-block text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 mt-1 ${r.chipClass}`}>
                    {r.chip}
                  </span>
                </div>
              </div>
              <p className="text-sm text-tribal-earth leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-tribal-earth mt-8">
          Testing the app for a neighbour?{" "}
          <Link href="/login" className="font-semibold text-brand-green hover:underline">
            Use a demo account from the sign-in page →
          </Link>
        </p>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────── */}
      <section className="container-wide py-14">
        <p className="section-label text-center mb-6">What residents say</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="quote-block">
              <p className="text-lg leading-relaxed mb-4 not-italic font-serif italic">
                {t.quote}
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-gold/20 flex items-center justify-center">
                  <span className="text-brand-gold font-bold text-sm">{t.initials}</span>
                </div>
                <div className="font-sans not-italic">
                  <p className="font-semibold text-sm text-white">{t.name}</p>
                  <p className="text-xs text-white/60">{t.role}</p>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-brand-gold text-brand-gold" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="maasai-stripe" />

      {/* ── Pricing ──────────────────────────────────────────────────── */}
      <section className="container-wide py-16">
        <div className="text-center mb-10">
          <p className="section-label mb-2">Pricing</p>
          <h2 className="font-display font-bold text-3xl md:text-4xl text-tribal-charcoal mb-2">
            Transparent pricing.{" "}
            <span className="font-serif italic text-brand-green">No surprises.</span>
          </h2>
          <p className="text-tribal-earth text-sm">Per estate, per month. Cancel anytime.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={
                t.highlight
                  ? "archetype-card p-7 shadow-hero"
                  : "tribal-card p-6 flex flex-col"
              }
            >
              {t.highlight && (
                <span className="text-[10px] bg-brand-gold text-white px-3 py-0.5 rounded-full mb-3 inline-block font-bold uppercase tracking-widest relative z-10">
                  Most popular
                </span>
              )}
              <div className={`font-display text-3xl font-extrabold relative z-10 ${t.highlight ? "text-white" : "text-tribal-charcoal"}`}>
                {t.price}
              </div>
              <div className={`text-sm relative z-10 ${t.highlight ? "text-white/60" : "text-tribal-earth"}`}>
                /month
              </div>
              <div className={`font-display font-bold text-xl mt-3 relative z-10 ${t.highlight ? "text-brand-gold" : "text-tribal-charcoal"}`}>
                {t.name}
              </div>
              <div className={`text-sm mb-5 relative z-10 ${t.highlight ? "text-white/60" : "text-tribal-earth"}`}>
                {t.units}
              </div>
              <ul className={`space-y-2.5 relative z-10 ${t.highlight ? "" : "flex-1"}`}>
                {t.features.map((f) => (
                  <li
                    key={f}
                    className={`flex items-start gap-2 text-sm ${t.highlight ? "text-white/90" : "text-tribal-charcoal"}`}
                  >
                    <Check className={`h-4 w-4 shrink-0 mt-0.5 ${t.highlight ? "text-brand-gold" : "text-brand-green"}`} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className={`mt-6 block text-center rounded-xl py-2.5 text-sm font-semibold transition-colors relative z-10 ${
                  t.highlight
                    ? "bg-brand-gold text-white hover:bg-brand-gold-dark"
                    : "border border-tribal-border text-brand-green hover:bg-tribal-cream-dark"
                }`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="kitenge-hero text-center relative overflow-hidden py-14">
        <div className="ring-deco container-wide relative z-10">
          <h2 className="font-display font-extrabold text-3xl md:text-4xl text-white mb-2">
            Ready to upgrade your estate?
          </h2>
          <p className="font-serif italic text-xl text-brand-gold mb-6">
            Your neighbours will notice the difference.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-dark text-white font-bold px-10 py-4 rounded-xl text-base transition-colors min-h-[48px]"
          >
            Start Free Trial <ChevronRight className="h-4 w-4" />
          </Link>
          <p className="text-white/40 text-sm mt-4">No credit card required.</p>
        </div>
      </section>

      <div className="maasai-stripe" />

      <footer className="container-wide py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-brand-green flex items-center justify-center">
            <span className="text-brand-gold font-bold text-xs">JH</span>
          </div>
          <span className="font-display font-bold text-brand-green">JiraniHub</span>
        </div>
        <p className="text-xs text-tribal-earth">
          © {new Date().getFullYear()} JiraniHub · Nairobi, Kenya
          <span className="hidden sm:inline"> · Your Digital Neighbour</span>
        </p>
      </footer>
    </div>
  );
}
