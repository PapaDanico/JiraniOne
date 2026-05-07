import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Users, Wrench, Megaphone, AlertCircle, Clock, CheckCircle,
  CreditCard, CalendarDays, Vote, BookOpen, Store, ShieldAlert, UserCog,
  TrendingUp, Package, Tag, HandCoins, Car, Coins, BarChart3,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEstate } from "@/hooks/useEstate";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { WeatherWidget, TrafficWidget } from "@/components/shared/weather-traffic";
import { api } from "@/lib/api";
import type { EstateAnalytics } from "@shared/types";

// ─── Module list ─────────────────────────────────────────────────────────────
const modules = [
  { href: "/visitors",      label: "Visitors",      icon: <Users className="h-5 w-5" />,       bg: "bg-[#1B5E20]/10",  fg: "text-[#1B5E20]" },
  { href: "/maintenance",   label: "Tickets",       icon: <Wrench className="h-5 w-5" />,      bg: "bg-[#D47A00]/10",  fg: "text-[#D47A00]" },
  { href: "/announcements", label: "Announcements", icon: <Megaphone className="h-5 w-5" />,   bg: "bg-purple-100",    fg: "text-purple-700" },
  { href: "/payments",      label: "Payments",      icon: <CreditCard className="h-5 w-5" />,  bg: "bg-[#D4A017]/15",  fg: "text-[#9A6E00]" },
  { href: "/emergency",     label: "Emergency",     icon: <ShieldAlert className="h-5 w-5" />, bg: "bg-[#B71C1C]/10",  fg: "text-[#B71C1C]" },
  { href: "/events",        label: "Events",        icon: <CalendarDays className="h-5 w-5" />,bg: "bg-cyan-100",      fg: "text-cyan-700" },
  { href: "/parcels",       label: "Parcels",       icon: <Package className="h-5 w-5" />,     bg: "bg-sky-100",       fg: "text-sky-700" },
  { href: "/classifieds",   label: "Noticeboard",   icon: <Tag className="h-5 w-5" />,         bg: "bg-[#1B5E20]/10",  fg: "text-[#1B5E20]" },
  { href: "/governance",    label: "Governance",    icon: <Vote className="h-5 w-5" />,        bg: "bg-indigo-100",    fg: "text-indigo-700" },
  { href: "/bookings",      label: "Bookings",      icon: <BookOpen className="h-5 w-5" />,    bg: "bg-pink-100",      fg: "text-pink-700" },
  { href: "/harambee",      label: "Harambee",      icon: <HandCoins className="h-5 w-5" />,   bg: "bg-orange-100",    fg: "text-orange-700" },
  { href: "/carpool",       label: "Carpool",       icon: <Car className="h-5 w-5" />,         bg: "bg-teal-100",      fg: "text-teal-700" },
  { href: "/chama",         label: "Chama",         icon: <Coins className="h-5 w-5" />,       bg: "bg-yellow-100",    fg: "text-yellow-700" },
  { href: "/marketplace",   label: "Marketplace",   icon: <Store className="h-5 w-5" />,       bg: "bg-amber-100",     fg: "text-amber-700" },
  { href: "/admin/users",   label: "Residents",     icon: <UserCog className="h-5 w-5" />,     bg: "bg-slate-100",     fg: "text-slate-700" },
];

// ─── CSS bar chart (no external dep) ─────────────────────────────────────────
function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-24">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[9px] text-[#6B5D45] font-semibold">{d.value > 0 ? d.value.toLocaleString("en-KE") : ""}</span>
          <div
            className="w-full rounded-t-sm bg-[#1B5E20] min-h-[2px] transition-all"
            style={{ height: `${Math.max((d.value / max) * 72, 2)}px` }}
          />
          <span className="text-[9px] text-[#6B5D45] text-center leading-tight">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Donut-style category pills ───────────────────────────────────────────────
function CategoryBreakdown({ data, total }: { data: Record<string, number>; total: number }) {
  if (total === 0) return <p className="text-xs text-[#6B5D45]">No tickets yet.</p>;
  const colors = ["bg-[#1B5E20]","bg-[#D4A017]","bg-[#B71C1C]","bg-sky-500","bg-purple-500","bg-pink-500","bg-cyan-500"];
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([cat, count], i) => (
        <div key={cat} className="flex items-center gap-1.5 bg-[#EDE7D8] rounded-xl px-2.5 py-1.5 border border-[#D4C9A8]">
          <span className={`w-2 h-2 rounded-full ${colors[i % colors.length]}`} />
          <span className="text-[11px] font-semibold text-[#212121] capitalize">{cat}</span>
          <span className="text-[11px] text-[#6B5D45]">{count}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, bg }: {
  label: string; value: number | string; icon: React.ReactNode; color: string; bg: string;
}) {
  return (
    <div className="tribal-card p-4 flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${bg} shrink-0`}>
        <span className={color}>{icon}</span>
      </div>
      <div>
        <div className={`text-2xl font-black ${color}`}>{value}</div>
        <div className="text-xs text-[#6B5D45] font-medium leading-tight">{label}</div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: estate } = useEstate();

  const { data: analytics, isLoading } = useQuery<EstateAnalytics>({
    queryKey: ["analytics"],
    queryFn: () => api.get<EstateAnalytics>("/api/analytics").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const monthlyData = (analytics?.payments.monthlyTotals ?? []).map((m) => ({
    label: m.month.slice(5), // "YYYY-MM" → "MM"
    value: m.total,
  }));

  return (
    <div className="page-wrap">
      <TopBar title="Admin" />

      <main className="max-w-lg mx-auto px-4 pt-5 pb-6 space-y-6 page-content">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="section-label mb-0.5">Management Board</p>
            <h1 className="tribal-heading text-2xl">Admin Dashboard</h1>
            <p className="text-sm text-[#6B5D45] mt-0.5">{user?.name} · {estate?.name ?? "…"}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#1B5E20] flex items-center justify-center shrink-0">
            <BarChart3 className="h-5 w-5 text-[#D4A017]" />
          </div>
        </div>

        {/* Weather & Traffic */}
        <div className="grid grid-cols-2 gap-3">
          <WeatherWidget />
          <TrafficWidget />
        </div>

        {/* KPI tiles */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0,1,2,3].map((i) => (
              <div key={i} className="tribal-card p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : analytics && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total Residents"  value={analytics.residents.total}           icon={<Users className="h-4 w-4" />}      color="text-[#1B5E20]"  bg="bg-[#1B5E20]/10" />
              <StatCard label="Revenue Collected" value={`KES ${(analytics.payments.totalCollected/1000).toFixed(0)}k`} icon={<CreditCard className="h-4 w-4" />}  color="text-[#9A6E00]"  bg="bg-[#D4A017]/15" />
              <StatCard label="Open Tickets"      value={analytics.maintenance.open}          icon={<Wrench className="h-4 w-4" />}     color="text-[#D47A00]"  bg="bg-[#D47A00]/10" />
              <StatCard label="Parcels at Gate"   value={analytics.parcels.atGate}            icon={<Package className="h-4 w-4" />}    color="text-sky-700"    bg="bg-sky-100" />
            </div>

            {/* Monthly payment chart */}
            {monthlyData.length > 0 && (
              <section>
                <p className="section-label mb-3">Monthly Collections (KES)</p>
                <div className="tribal-card p-4">
                  <BarChart data={monthlyData} />
                </div>
              </section>
            )}

            {/* Maintenance breakdown */}
            <section>
              <p className="section-label mb-3">Maintenance by Category</p>
              <div className="tribal-card p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Open",        value: analytics.maintenance.open,       color: "text-[#D47A00]" },
                    { label: "In Progress", value: analytics.maintenance.inProgress, color: "text-[#1B5E20]" },
                    { label: "Resolved",    value: analytics.maintenance.resolved,   color: "text-[#6B5D45]" },
                  ].map((s) => (
                    <div key={s.label}>
                      <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
                      <div className="text-[10px] text-[#6B5D45] font-medium">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-[#D4C9A8]">
                  <CategoryBreakdown
                    data={analytics.maintenance.byCategory}
                    total={analytics.maintenance.total}
                  />
                </div>
              </div>
            </section>

            {/* Visitors & Emergency */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Visitors This Month" value={analytics.visitors.thisMonth}   icon={<Users className="h-4 w-4" />}      color="text-indigo-700" bg="bg-indigo-100" />
              <StatCard label="Active Alerts"        value={analytics.emergency.active}     icon={<AlertCircle className="h-4 w-4" />} color="text-[#B71C1C]"  bg="bg-[#B71C1C]/10" />
            </div>
          </>
        )}

        {/* Module grid */}
        <section>
          <p className="section-label mb-3">All Modules</p>
          <div className="grid grid-cols-3 gap-2.5">
            {modules.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-[#D4C9A8] bg-[#EDE7D8] hover:border-[#1B5E20]/30 hover:bg-[#E4DCC8] transition-all min-h-[80px] justify-center"
              >
                <div className={`rounded-xl p-2 ${m.bg}`}>
                  <span className={m.fg}>{m.icon}</span>
                </div>
                <span className="text-[10px] font-semibold text-[#212121] text-center leading-tight">{m.label}</span>
              </Link>
            ))}
          </div>
        </section>

      </main>

      <BottomNav />
    </div>
  );
}
