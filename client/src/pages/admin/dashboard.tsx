import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Users, Wrench, Megaphone, AlertCircle, Clock, CheckCircle,
  CreditCard, CalendarDays, Vote, BookOpen, Store, ShieldAlert, UserCog,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEstate } from "@/hooks/useEstate";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { SectionLoader } from "@/components/shared/loading";

interface TicketStats { open: number; overdue: number; inProgress: number }

const modules = [
  { href: "/visitors",      label: "Wageni",      icon: <Users className="h-5 w-5" />,       bg: "bg-[#1B5E20]/10",  fg: "text-[#1B5E20]" },
  { href: "/maintenance",   label: "Tiketi",      icon: <Wrench className="h-5 w-5" />,      bg: "bg-[#D47A00]/10",  fg: "text-[#D47A00]" },
  { href: "/announcements", label: "Matangazo",   icon: <Megaphone className="h-5 w-5" />,   bg: "bg-purple-100",    fg: "text-purple-700" },
  { href: "/payments",      label: "Malipo",      icon: <CreditCard className="h-5 w-5" />,  bg: "bg-[#D4A017]/15",  fg: "text-[#9A6E00]" },
  { href: "/emergency",     label: "Dharura",     icon: <ShieldAlert className="h-5 w-5" />, bg: "bg-[#B71C1C]/10",  fg: "text-[#B71C1C]" },
  { href: "/events",        label: "Matukio",     icon: <CalendarDays className="h-5 w-5" />,bg: "bg-cyan-100",      fg: "text-cyan-700" },
  { href: "/governance",    label: "Serikali",    icon: <Vote className="h-5 w-5" />,        bg: "bg-indigo-100",    fg: "text-indigo-700" },
  { href: "/bookings",      label: "Bukuu",       icon: <BookOpen className="h-5 w-5" />,    bg: "bg-pink-100",      fg: "text-pink-700" },
  { href: "/marketplace",   label: "Soko",        icon: <Store className="h-5 w-5" />,       bg: "bg-amber-100",     fg: "text-amber-700" },
  { href: "/admin/users",   label: "Wakazi",      icon: <UserCog className="h-5 w-5" />,     bg: "bg-slate-100",     fg: "text-slate-700" },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: estate } = useEstate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["maintenance", "stats"],
    queryFn: () => api.get<TicketStats>("/api/maintenance/stats").then((r) => r.data),
  });

  return (
    <div className="page-wrap">
      <TopBar title="Admin" />

      <main className="max-w-lg mx-auto px-4 pt-5 pb-6 space-y-6 page-content">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="section-label mb-0.5">Bodi ya Usimamizi</p>
            <h1 className="tribal-heading text-2xl">Jopo la Msimamizi</h1>
            <p className="text-sm text-[#6B5D45] mt-0.5">{user?.name} · {estate?.name ?? "…"}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#1B5E20] flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-[#D4A017]" />
          </div>
        </div>

        {/* Maintenance stats */}
        <div>
          <p className="section-label mb-3">Tiketi za Matengenezo</p>
          {isLoading ? (
            <SectionLoader />
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Wazi",     value: stats?.open ?? 0,       icon: <AlertCircle className="h-4 w-4" />, color: "text-[#D47A00]",  bg: "bg-[#D47A00]/10" },
                { label: "Zilizochelewa", value: stats?.overdue ?? 0, icon: <Clock className="h-4 w-4" />,     color: "text-[#B71C1C]",  bg: "bg-[#B71C1C]/10" },
                { label: "Zinaendelea", value: stats?.inProgress ?? 0,icon: <CheckCircle className="h-4 w-4" />,color: "text-[#1B5E20]", bg: "bg-[#1B5E20]/10" },
              ].map((s) => (
                <Card key={s.label} className="text-center">
                  <CardContent className="py-4 px-3">
                    <div className={`inline-flex p-2 rounded-xl ${s.bg} mb-2`}>
                      <span className={s.color}>{s.icon}</span>
                    </div>
                    <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-[#6B5D45] mt-1 font-medium leading-tight">{s.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Module grid */}
        <div>
          <p className="section-label mb-3">Moduli Zote</p>
          <div className="grid grid-cols-3 gap-3">
            {modules.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-[#D4C9A8] bg-[#EDE7D8] hover:border-[#1B5E20]/30 hover:bg-[#E4DCC8] transition-all min-h-[84px] justify-center"
              >
                <div className={`rounded-xl p-2 ${m.bg}`}>
                  <span className={m.fg}>{m.icon}</span>
                </div>
                <span className="text-xs font-semibold text-[#212121] text-center leading-tight">{m.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
