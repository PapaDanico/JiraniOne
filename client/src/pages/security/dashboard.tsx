import { Link } from "wouter";
import { QrCode, Search, ClipboardList, ShieldAlert, Package } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { RoleBanner } from "@/components/shared/role-banner";
import { TrafficWidget } from "@/components/shared/weather-traffic";

const actions = [
  {
    href: "/visitors",
    label: "Scan QR",
    desc: "Check a visitor's pass",
    icon: <QrCode className="h-9 w-9" />,
    bg: "bg-[#1B5E20]",
    accent: "border-[#D4A017]/30",
  },
  {
    href: "/visitors",
    label: "Search Visitor",
    desc: "Search by phone number",
    icon: <Search className="h-9 w-9" />,
    bg: "bg-[#D47A00]",
    accent: "border-[#D47A00]/30",
  },
  {
    href: "/visitors",
    label: "Gate Log",
    desc: "Full entry history",
    icon: <ClipboardList className="h-9 w-9" />,
    bg: "bg-[#212121]",
    accent: "border-white/10",
  },
  {
    href: "/emergency",
    label: "Emergency",
    desc: "Raise an alert",
    icon: <ShieldAlert className="h-9 w-9" />,
    bg: "bg-[#B71C1C]",
    accent: "border-[#B71C1C]/30",
  },
  {
    href: "/parcels",
    label: "Parcels",
    desc: "Log & track deliveries",
    icon: <Package className="h-9 w-9" />,
    bg: "bg-sky-600",
    accent: "border-sky-400/30",
  },
];

export default function SecurityDashboard() {
  const { user } = useAuth();

  return (
    <div className="page-wrap">
      <TopBar title="Gate" />

      <main className="max-w-lg mx-auto px-4 pt-5 pb-6 page-content">
        {/* Role banner */}
        <div className="mb-5">
          <RoleBanner role="security" />
        </div>

        {/* Header */}
        <div className="kitenge-hero rounded-2xl p-5 mb-6 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[#D4A017] text-sm font-semibold mb-0.5">Security Panel</p>
            <h1 className="font-bold text-2xl text-white tracking-tight">Estate Gate</h1>
            <p className="text-white/60 text-sm mt-1">{user?.name} · Gate Officer</p>
          </div>
        </div>

        <p className="section-label mb-4">Quick Actions</p>
        <div className="grid grid-cols-2 gap-4">
          {actions.map((a) => (
            <Link
              key={a.href + a.label}
              href={a.href}
              className={`flex flex-col items-center justify-center p-6 rounded-2xl text-center gap-3 min-h-[148px] text-white border ${a.accent} ${a.bg} transition-opacity hover:opacity-90`}
            >
              {a.icon}
              <div>
                <div className="font-bold text-sm">{a.label}</div>
                <div className="text-xs opacity-70 mt-0.5 leading-tight">{a.desc}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Traffic */}
        <div className="mt-6">
          <TrafficWidget />
        </div>

        {/* Tip */}
        <div className="mt-6 bg-[#EDE7D8] border border-[#D4C9A8] rounded-2xl p-4">
          <p className="text-xs text-[#6B5D45] text-center">
            💡 <strong>Reminder:</strong> Every visitor needs an approved pass. Check QR code or search by phone number.
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
