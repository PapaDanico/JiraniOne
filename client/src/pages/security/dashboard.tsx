import { Link } from "wouter";
import { QrCode, Search, ClipboardList, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TopBar, BottomNav } from "@/components/shared/navigation";

const actions = [
  {
    href: "/visitors",
    label: "Scan QR",
    desc: "Angalia pass ya mgeni",
    icon: <QrCode className="h-9 w-9" />,
    bg: "bg-[#1B5E20]",
    accent: "border-[#D4A017]/30",
  },
  {
    href: "/visitors",
    label: "Tafuta Mgeni",
    desc: "Tafuta kwa nambari ya simu",
    icon: <Search className="h-9 w-9" />,
    bg: "bg-[#D47A00]",
    accent: "border-[#D47A00]/30",
  },
  {
    href: "/visitors",
    label: "Logi ya Lango",
    desc: "Historia kamili ya kuingia",
    icon: <ClipboardList className="h-9 w-9" />,
    bg: "bg-[#212121]",
    accent: "border-white/10",
  },
  {
    href: "/emergency",
    label: "Dharura",
    desc: "Piga kengele ya hatari",
    icon: <ShieldAlert className="h-9 w-9" />,
    bg: "bg-[#B71C1C]",
    accent: "border-[#B71C1C]/30",
  },
];

export default function SecurityDashboard() {
  const { user } = useAuth();

  return (
    <div className="page-wrap">
      <TopBar title="Lango" />

      <main className="max-w-lg mx-auto px-4 pt-5 pb-6 page-content">
        {/* Header */}
        <div className="kitenge-hero rounded-2xl p-5 mb-6 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[#D4A017] text-sm font-semibold mb-0.5">Jopo la Ulinzi</p>
            <h1 className="font-bold text-2xl text-white tracking-tight">Lango la Estate</h1>
            <p className="text-white/60 text-sm mt-1">{user?.name} · Askari wa Lango</p>
          </div>
        </div>

        <p className="section-label mb-4">Vitendo vya Haraka</p>
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

        {/* Tip */}
        <div className="mt-6 bg-[#EDE7D8] border border-[#D4C9A8] rounded-2xl p-4">
          <p className="text-xs text-[#6B5D45] text-center">
            💡 <strong>Kumbuka:</strong> Kila mgeni anahitaji pass iliyoidhinishwa. Angalia QR au tafuta kwa simu.
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
