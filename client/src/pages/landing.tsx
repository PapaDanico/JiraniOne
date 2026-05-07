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
    title: "Maintenance Tiketi",
    desc: "Submit, track, and resolve estate issues with photo evidence and audit trails.",
    color: "bg-[#D47A00]/10 text-[#D47A00]",
  },
  {
    icon: <CreditCard className="h-6 w-6" />,
    title: "M-PESA Malipo",
    desc: "Levy collection, Harambee fundraising, and instant receipts via Safaricom.",
    color: "bg-[#D4A017]/15 text-[#9A6E00]",
  },
  {
    icon: <Bell className="h-6 w-6" />,
    title: "Matangazo & SMS",
    desc: "Broadcast to residents in-app or via SMS. Works on 2G/3G Kenyan networks.",
    color: "bg-purple-100 text-purple-700",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Utawala & Kura",
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
    units: "Hadi nyumba 20",
    features: ["Wageni management", "Maintenance tickets", "Matangazo"],
  },
  {
    name: "Growth",
    price: "KES 9,500",
    units: "Nyumba 21–100",
    features: ["Kila kitu cha Starter", "M-PESA malipo", "Soko la biashara", "Matukio & booking"],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Wasiliana",
    units: "Nyumba 100+",
    features: ["Kila kitu cha Growth", "Integrations maalum", "Msaada wa pekee"],
  },
];

const testimonials = [
  {
    quote: "JiraniHub imebadilisha jinsi tunavyosimamia estate yetu. Wageni sasa hawavurugani.",
    name: "Wanjiku M.",
    role: "Admin, Westlands Estate",
    initials: "WM",
  },
  {
    quote: "Kuweza kulipa levy yangu via M-PESA moja kwa moja kwenye app ni rahisi sana.",
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
            Ingia / Sign In
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
            🇰🇪 Imeundwa kwa Estates za Kenya
          </div>
          <h1 className="font-bold text-4xl md:text-5xl leading-tight mb-5 tracking-tight">
            Badilisha WhatsApp Group.<br />
            <span className="text-[#D4A017]">Simamia Estate Yako Vizuri.</span>
          </h1>
          <p className="text-white/75 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
            JiraniHub ni mfumo wa kidijitali kwa jumuiya za makazi ya Kenya —
            wageni, matengenezo, M-PESA, na zaidi.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-[#D4A017] hover:bg-[#B8860B] text-white font-bold px-8 py-3.5 rounded-xl text-base transition-colors"
            >
              Anza Bure <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 border border-white/30 text-white hover:bg-white/10 font-medium px-8 py-3.5 rounded-xl text-base transition-colors"
            >
              Angalia Demo
            </Link>
          </div>
          <p className="text-white/40 text-sm mt-4">Hakuna kadi ya mkopo. Bili via M-PESA.</p>
        </div>
      </section>

      {/* Maasai stripe */}
      <div className="maasai-stripe" />

      {/* Features */}
      <section className="px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="section-label mb-2">Vipengele</p>
            <h2 className="tribal-heading text-3xl">Kila kitu estate yako inahitaji</h2>
            <p className="text-[#6B5D45] mt-2">Moduli 9 zilizounganishwa. Jukwaa moja.</p>
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
          <p className="section-label text-center mb-8">Wanachosema wakazi</p>
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
            <p className="section-label mb-2">Bei</p>
            <h2 className="tribal-heading text-3xl">Bei wazi, bila mshangao</h2>
            <p className="text-[#6B5D45] mt-2">Kwa estate, kwa mwezi. Acha wakati wowote.</p>
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
                    Inayopendwa Zaidi
                  </span>
                )}
                <div className="text-2xl font-bold mb-0.5">{t.price}</div>
                <div className={`text-sm mb-1 ${t.highlight ? "text-white/60" : "text-[#6B5D45]"}`}>/mwezi</div>
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
                  Anza Sasa
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
            Tayari kuboresha estate yako?
          </h2>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-[#D4A017] hover:bg-[#B8860B] text-white font-bold px-10 py-4 rounded-xl text-base transition-colors"
          >
            Anza Jaribio Bure <ChevronRight className="h-4 w-4" />
          </Link>
          <p className="text-white/40 text-sm mt-4">Hakuna kadi ya mkopo inahitajika.</p>
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
          © {new Date().getFullYear()} JiraniHub · Nairobi, Kenya · Jirani wa Kweli
        </p>
      </footer>
    </div>
  );
}
