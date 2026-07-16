import { Link } from "wouter";
import { QrCode, Search, ClipboardList, ShieldAlert, Package } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { RoleBanner } from "@/components/shared/role-banner";
import { SectionTitle } from "@/components/shared/section-title";
import { InfoBox } from "@/components/shared/info-box";
import { TrafficWidget } from "@/components/shared/weather-traffic";

const ACTIONS = [
  {
    href: "/visitors",
    label: "Scan QR",
    desc: "Check a visitor's pass",
    Icon: QrCode,
    bg: "bg-brand-green",
  },
  {
    href: "/visitors",
    label: "Search Visitor",
    desc: "Search by phone number",
    Icon: Search,
    bg: "bg-brand-amber",
  },
  {
    href: "/visitors",
    label: "Gate Log",
    desc: "Full entry history",
    Icon: ClipboardList,
    bg: "bg-tribal-charcoal",
  },
  {
    href: "/emergency",
    label: "Emergency",
    desc: "Raise an alert",
    Icon: ShieldAlert,
    bg: "bg-brand-red",
  },
  {
    href: "/parcels",
    label: "Parcels",
    desc: "Log & track deliveries",
    Icon: Package,
    bg: "bg-sky-600",
  },
];

export default function SecurityDashboard() {
  const { user } = useAuth();

  return (
    <div className="page-wrap" data-bottomnav="true">
      <TopBar title="Gate" />

      <main className="container-app pt-5 pb-6 space-y-5 page-content">
        <RoleBanner role="security" />

        {/* Hero */}
        <div className="archetype-card">
          <div className="relative z-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gold mb-1">
              Security Panel
            </p>
            <h1 className="font-display font-extrabold text-2xl tracking-tight">
              Estate Gate
            </h1>
            <p className="font-serif italic text-base text-white/70 mt-0.5">
              {user?.name} · Gate Officer
            </p>
            <div className="mt-4 flag-bar w-24" />
          </div>
        </div>

        {/* Primary scan action — large, thumb-friendly */}
        <Link
          href="/visitors"
          className="block rounded-2xl bg-brand-green text-white p-6 text-center min-h-[140px] hover:bg-brand-green-dark transition-colors active:scale-[0.99]"
        >
          <QrCode className="h-12 w-12 mx-auto mb-3 text-brand-gold" />
          <p className="font-display font-extrabold text-xl">Scan visitor QR</p>
          <p className="text-sm text-white/70 mt-1">
            Open the gate scanner — search visitors by phone number
          </p>
        </Link>

        {/* Quick actions */}
        <section>
          <SectionTitle>Quick actions</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {ACTIONS.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className={`flex flex-col justify-between rounded-2xl p-4 min-h-[120px] text-white transition-opacity hover:opacity-90 active:scale-[0.98] ${a.bg}`}
              >
                <a.Icon className="h-7 w-7" />
                <div className="mt-2">
                  <p className="font-display font-bold text-sm leading-tight">{a.label}</p>
                  <p className="text-[11px] opacity-75 mt-0.5 leading-tight">{a.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Traffic for gate handover */}
        <section>
          <SectionTitle>Local traffic</SectionTitle>
          <TrafficWidget />
        </section>

        <InfoBox variant="red" title="Emergency response">
          <p>
            Tap <strong>Emergency</strong> to broadcast an alert to all on-duty
            security and the estate admin. Use only for active incidents — fire,
            medical, intrusion, or a panic-button trigger from a resident.
          </p>
        </InfoBox>
      </main>

      <BottomNav />
    </div>
  );
}
