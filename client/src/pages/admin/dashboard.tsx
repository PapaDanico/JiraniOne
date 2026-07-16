import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState } from "react";
import {
  Users, Wrench, Megaphone, AlertCircle, CreditCard, CalendarDays, Vote,
  BookOpen, Store, ShieldAlert, UserCog, Package, Tag, HandCoins, Car,
  Coins, BarChart3, TrendingUp, Activity, FileText, Building2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEstate } from "@/hooks/useEstate";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { RoleBanner } from "@/components/shared/role-banner";
import { SectionTitle } from "@/components/shared/section-title";
import { KpiTile } from "@/components/shared/kpi-tile";
import { InfoBox } from "@/components/shared/info-box";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { EstateAnalytics } from "@shared/types";

// ─── Module shortcuts ────────────────────────────────────────────────────────

const MODULES = [
  { href: "/visitors",      label: "Visitors",      Icon: Users,        bg: "bg-brand-green/10",  fg: "text-brand-green" },
  { href: "/maintenance",   label: "Tickets",       Icon: Wrench,       bg: "bg-brand-amber/10",  fg: "text-brand-amber" },
  { href: "/announcements", label: "Announcements", Icon: Megaphone,    bg: "bg-purple-100",      fg: "text-purple-700" },
  { href: "/payments",      label: "Payments",      Icon: CreditCard,   bg: "bg-brand-gold/15",   fg: "text-brand-gold-dark" },
  { href: "/emergency",     label: "Emergency",     Icon: ShieldAlert,  bg: "bg-brand-red/10",    fg: "text-brand-red" },
  { href: "/events",        label: "Events",        Icon: CalendarDays, bg: "bg-cyan-100",        fg: "text-cyan-700" },
  { href: "/parcels",       label: "Parcels",       Icon: Package,      bg: "bg-sky-100",         fg: "text-sky-700" },
  { href: "/classifieds",   label: "Noticeboard",   Icon: Tag,          bg: "bg-brand-green/10",  fg: "text-brand-green" },
  { href: "/governance",    label: "Governance",    Icon: Vote,         bg: "bg-indigo-100",      fg: "text-indigo-700" },
  { href: "/bookings",      label: "Bookings",      Icon: BookOpen,     bg: "bg-pink-100",        fg: "text-pink-700" },
  { href: "/harambee",      label: "Harambee",      Icon: HandCoins,    bg: "bg-orange-100",      fg: "text-orange-700" },
  { href: "/carpool",       label: "Carpool",       Icon: Car,          bg: "bg-teal-100",        fg: "text-teal-700" },
  { href: "/chama",         label: "Chama",         Icon: Coins,        bg: "bg-yellow-100",      fg: "text-yellow-700" },
  { href: "/marketplace",   label: "Marketplace",   Icon: Store,        bg: "bg-amber-100",       fg: "text-amber-700" },
  { href: "/admin/users",   label: "Residents",     Icon: UserCog,      bg: "bg-slate-100",       fg: "text-slate-700" },
];

// ─── CSS bar chart (no external dep) ─────────────────────────────────────────

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  // Every month in range still produces a row (just value: 0) — so a
  // brand-new estate with zero collections rendered a full row of
  // invisible/flat bars instead of a clear empty state.
  if (data.every((d) => d.value === 0)) {
    return <p className="text-xs text-tribal-earth py-8 text-center">No collections yet.</p>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-28">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[9px] text-tribal-earth font-semibold">
            {d.value > 0 ? d.value.toLocaleString("en-KE") : ""}
          </span>
          <div
            className="w-full rounded-t-sm bg-brand-green min-h-[2px] transition-all"
            style={{ height: `${Math.max((d.value / max) * 84, 2)}px` }}
          />
          <span className="text-[9px] text-tribal-earth text-center leading-tight">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function CategoryBreakdown({ data, total }: { data: Record<string, number>; total: number }) {
  if (total === 0) return <p className="text-xs text-tribal-earth">No tickets yet.</p>;
  const colors = ["bg-brand-green", "bg-brand-gold", "bg-brand-red", "bg-sky-500", "bg-purple-500", "bg-pink-500", "bg-cyan-500"];
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([cat, count], i) => (
        <div
          key={cat}
          className="flex items-center gap-1.5 bg-tribal-cream-dark rounded-xl px-2.5 py-1.5 border border-tribal-border-soft"
        >
          <span className={`w-2 h-2 rounded-full ${colors[i % colors.length]}`} />
          <span className="text-[11px] font-semibold text-tribal-charcoal capitalize">{cat}</span>
          <span className="text-[11px] text-tribal-earth">{count}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

type TabKey = "overview" | "operations" | "modules";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "overview",   label: "Overview" },
  { key: "operations", label: "Operations" },
  { key: "modules",    label: "All Modules" },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: estate } = useEstate();
  const [tab, setTab] = useState<TabKey>("overview");

  const { data: analytics, isLoading, isError, refetch } = useQuery<EstateAnalytics>({
    queryKey: ["analytics"],
    queryFn: () => api.get<EstateAnalytics>("/api/analytics").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const monthlyData = (analytics?.payments.monthlyTotals ?? []).map((m) => ({
    label: m.month.slice(5),
    value: m.total,
  }));

  return (
    <div className="page-wrap" data-bottomnav="true">
      <TopBar title="Admin" />

      <main className="container-app pt-5 pb-6 space-y-6 page-content">

        {/* Role banner */}
        <RoleBanner role="admin" />

        {/* Header — gradient archetype card (KASH/Diagnostic fusion) */}
        <div className="archetype-card relative">
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gold mb-1">
                Management Console
              </p>
              <h1 className="font-display font-extrabold text-2xl tracking-tight">
                {user?.name}
              </h1>
              <p className="font-serif italic text-base text-white/70 mt-0.5 truncate">
                {estate?.name ?? "Loading…"}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-brand-gold/20 border border-brand-gold/40 flex items-center justify-center shrink-0">
              <BarChart3 className="h-6 w-6 text-brand-gold" />
            </div>
          </div>
          <div className="mt-4 flag-bar w-28 relative z-10" />
        </div>

        {/* Tabs */}
        <div className="tab-row" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              data-active={tab === t.key}
              onClick={() => setTab(t.key)}
              className="tab-btn"
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Overview tab ─────────────────────────────────────── */}
        {tab === "overview" && (
          <>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="kpi-tile animate-pulse h-20" />
                ))}
              </div>
            ) : isError ? (
              <div className="tribal-card p-6 text-center space-y-3">
                <p className="text-sm text-[#B71C1C] font-medium">
                  Failed to load estate analytics.
                </p>
                <button
                  onClick={() => refetch()}
                  className="text-sm font-semibold text-[#1B5E20] underline underline-offset-2"
                >
                  Try again
                </button>
              </div>
            ) : (
              analytics && (
                <>
                  <section>
                    <SectionTitle icon={<Activity className="h-4 w-4" />}>
                      Estate at a glance
                    </SectionTitle>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <KpiTile
                        label="Residents"
                        value={analytics.residents.total}
                        tone="green"
                        icon={<Users className="h-4 w-4" />}
                        href="/admin/users"
                      />
                      <KpiTile
                        label="Revenue (KES)"
                        value={`${(analytics.payments.totalCollected / 1000).toFixed(0)}k`}
                        tone="gold"
                        icon={<CreditCard className="h-4 w-4" />}
                        href="/payments"
                      />
                      <KpiTile
                        label="Open Tickets"
                        value={analytics.maintenance.open}
                        tone={analytics.maintenance.open > 0 ? "red" : "neutral"}
                        icon={<Wrench className="h-4 w-4" />}
                        href="/maintenance"
                      />
                      <KpiTile
                        label="Parcels at Gate"
                        value={analytics.parcels.atGate}
                        tone={analytics.parcels.atGate > 0 ? "gold" : "neutral"}
                        icon={<Package className="h-4 w-4" />}
                        href="/parcels"
                      />
                    </div>
                  </section>

                  {monthlyData.length > 0 && (
                    <section>
                      <SectionTitle icon={<TrendingUp className="h-4 w-4" />}>
                        Monthly Collections (KES)
                      </SectionTitle>
                      <div className="tribal-card p-5">
                        <BarChart data={monthlyData} />
                      </div>
                    </section>
                  )}

                  <section>
                    <SectionTitle icon={<Wrench className="h-4 w-4" />}>
                      Maintenance
                    </SectionTitle>
                    <div className="ibox space-y-4">
                      <div className="grid grid-cols-3 gap-3 text-center">
                        {[
                          { label: "Open",        value: analytics.maintenance.open,       color: "text-brand-amber" },
                          { label: "In Progress", value: analytics.maintenance.inProgress, color: "text-brand-green" },
                          { label: "Resolved",    value: analytics.maintenance.resolved,   color: "text-tribal-earth" },
                        ].map((s) => (
                          <div key={s.label}>
                            <div className={cn("font-display text-2xl font-extrabold", s.color)}>
                              {s.value}
                            </div>
                            <div className="text-[10px] text-tribal-earth uppercase font-bold tracking-wider mt-0.5">
                              {s.label}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-tribal-border-soft pt-3">
                        <p className="text-[10px] uppercase tracking-wider text-tribal-muted font-bold mb-2">
                          By category
                        </p>
                        <CategoryBreakdown
                          data={analytics.maintenance.byCategory}
                          total={analytics.maintenance.total}
                        />
                      </div>
                    </div>
                  </section>

                  <section>
                    <SectionTitle icon={<Users className="h-4 w-4" />}>
                      Visitors & Emergency
                    </SectionTitle>
                    <div className="grid grid-cols-2 gap-3">
                      <KpiTile
                        label="Visitors / month"
                        value={analytics.visitors.thisMonth}
                        tone="green"
                        icon={<Users className="h-4 w-4" />}
                      />
                      <KpiTile
                        label="Active Alerts"
                        value={analytics.emergency.active}
                        tone={analytics.emergency.active > 0 ? "red" : "neutral"}
                        icon={<AlertCircle className="h-4 w-4" />}
                        href="/emergency"
                      />
                    </div>
                  </section>
                </>
              )
            )}
          </>
        )}

        {/* ── Operations tab ───────────────────────────────────── */}
        {tab === "operations" && (
          <div className="space-y-5">
            <InfoBox
              variant="green"
              title="Quick links"
              icon={<FileText className="h-4 w-4 text-brand-green" />}
            >
              <p>The four operational surfaces you'll touch most as an admin. Everything else is one tap away on the All Modules tab.</p>
            </InfoBox>
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: "/maintenance",   label: "Open tickets",     desc: "Triage, assign, close",   Icon: Wrench,    tone: "amber" as const },
                { href: "/payments",      label: "Levy collection",  desc: "STK push & history",      Icon: CreditCard, tone: "gold" as const },
                { href: "/announcements", label: "Broadcast notice", desc: "Push + SMS to estate",    Icon: Megaphone, tone: "green" as const },
                { href: "/admin/users",   label: "Residents",        desc: "Create / suspend / role", Icon: UserCog,   tone: "green" as const },
              ].map((q) => (
                <Link
                  key={q.href}
                  href={q.href}
                  className={cn(
                    "rounded-2xl p-4 text-white min-h-[110px] flex flex-col justify-between transition-opacity hover:opacity-90 active:scale-[0.98]",
                    q.tone === "amber" ? "bg-brand-amber" : q.tone === "gold" ? "bg-brand-gold-dark" : "bg-brand-green",
                  )}
                >
                  <q.Icon className="h-5 w-5" />
                  <div>
                    <p className="font-display font-bold text-sm">{q.label}</p>
                    <p className="text-[11px] opacity-80 mt-0.5">{q.desc}</p>
                  </div>
                </Link>
              ))}
            </div>

            <InfoBox
              variant="gold"
              title="Admin commitments"
              icon={<Building2 className="h-4 w-4 text-brand-gold-dark" />}
            >
              <p>
                Every action you take here is recorded in the audit log — useful for
                AGM transparency and committee accountability. Sensitive
                actions (role change, suspensions, refunds) trigger an in-app
                notification to the affected resident.
              </p>
            </InfoBox>
          </div>
        )}

        {/* ── All modules tab ───────────────────────────────────── */}
        {tab === "modules" && (
          <section>
            <SectionTitle>All modules</SectionTitle>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2.5">
              {MODULES.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-tribal-border-soft bg-white hover:shadow-card-lg transition-all min-h-[88px] justify-center"
                >
                  <div className={`rounded-xl p-2 ${m.bg}`}>
                    <m.Icon className={`h-5 w-5 ${m.fg}`} />
                  </div>
                  <span className="text-[10px] font-semibold text-tribal-charcoal text-center leading-tight">
                    {m.label}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
