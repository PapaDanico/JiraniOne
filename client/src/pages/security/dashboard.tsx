import { Link } from "wouter";
import { QrCode, Search, ClipboardList, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TopBar, BottomNav } from "@/components/shared/navigation";

const actions = [
  {
    href: "/visitors/scan",
    label: "Scan QR Code",
    desc: "Scan visitor pass at gate",
    icon: <QrCode className="h-8 w-8" />,
    color: "bg-[#1A5C38] text-white",
  },
  {
    href: "/visitors/lookup",
    label: "Manual Lookup",
    desc: "Search visitor by phone",
    icon: <Search className="h-8 w-8" />,
    color: "bg-[#D47A00] text-white",
  },
  {
    href: "/visitors/gate-log",
    label: "Gate Log",
    desc: "Full entry/exit history",
    icon: <ClipboardList className="h-8 w-8" />,
    color: "bg-gray-700 text-white",
  },
  {
    href: "/emergency",
    label: "Emergency",
    desc: "Raise an alert",
    icon: <ShieldAlert className="h-8 w-8" />,
    color: "bg-red-600 text-white",
  },
];

export default function SecurityDashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white pb-20">
      <TopBar title="Gate" />

      <main className="max-w-lg mx-auto px-4 pt-4 pb-6">
        <div className="mb-6">
          <h1 className="font-['Plus_Jakarta_Sans'] font-bold text-2xl text-gray-900">
            Gate Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {user?.name} · Security Officer
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={`flex flex-col items-center justify-center p-6 rounded-2xl text-center gap-3 min-h-[140px] transition-opacity hover:opacity-90 ${a.color}`}
            >
              {a.icon}
              <div>
                <div className="font-semibold text-sm">{a.label}</div>
                <div className="text-xs opacity-80 mt-0.5">{a.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
