import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Wrench, ShieldAlert, CreditCard, CalendarDays, Store, Vote, BookOpen,
  Package, Tag, Users, Bell, PackageCheck, Megaphone, ChevronRight,
  AlertCircle, HandCoins, Car, Coins, Activity, FileText,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEstate } from "@/hooks/useEstate";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { RoleBanner } from "@/components/shared/role-banner";
import { SectionTitle } from "@/components/shared/section-title";
import { KpiTile } from "@/components/shared/kpi-tile";
import { Badge } from "@/components/ui/badge";
import { WeatherWidget, TrafficWidget } from "@/components/shared/weather-traffic";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/utils";
import type { Announcement, MaintenanceTicket, Notification, Parcel } from "@shared/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ActionTileProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
  tone: "green" | "amber" | "gold" | "red";
}

const ACTION_TONE: Record<ActionTileProps["tone"], string> = {
  green: "bg-brand-green",
  amber: "bg-brand-amber",
  gold:  "bg-brand-gold-dark",
  red:   "bg-brand-red",
};

function ActionTile({ href, icon, label, desc, tone }: ActionTileProps) {
  return (
    <Link href={href}>
      <div
        className={`flex flex-col justify-between rounded-2xl p-4 min-h-[120px] text-white transition-opacity hover:opacity-90 active:scale-[0.98] ${ACTION_TONE[tone]}`}
      >
        <div className="p-2 bg-white/20 rounded-xl w-fit">{icon}</div>
        <div className="mt-2">
          <p className="font-display font-bold text-sm leading-tight">{label}</p>
          <p className="text-[11px] opacity-75 mt-0.5 leading-tight">{desc}</p>
        </div>
      </div>
    </Link>
  );
}

// "Visitors" is deliberately not repeated here — it already has its own
// bottom-nav tab and the "Invite Visitor" quick-action tile above, so a
// third entry in this grid was pure redundancy with no added navigation
// value.
const MORE_TILES = [
  { href: "/parcels",      label: "Parcels",     Icon: Package,      bg: "bg-sky-100",     fg: "text-sky-700" },
  { href: "/classifieds",  label: "Noticeboard", Icon: Tag,          bg: "bg-green-100",   fg: "text-green-800" },
  { href: "/events",       label: "Events",      Icon: CalendarDays, bg: "bg-cyan-100",    fg: "text-cyan-700" },
  { href: "/governance",   label: "Governance",  Icon: Vote,         bg: "bg-purple-100",  fg: "text-purple-700" },
  { href: "/bookings",     label: "Bookings",    Icon: BookOpen,     bg: "bg-pink-100",    fg: "text-pink-700" },
  { href: "/harambee",     label: "Harambee",    Icon: HandCoins,    bg: "bg-orange-100",  fg: "text-orange-700" },
  { href: "/carpool",      label: "Carpool",     Icon: Car,          bg: "bg-teal-100",    fg: "text-teal-700" },
  { href: "/chama",        label: "Chama",       Icon: Coins,        bg: "bg-yellow-100",  fg: "text-yellow-700" },
  { href: "/marketplace",  label: "Marketplace", Icon: Store,        bg: "bg-amber-100",   fg: "text-amber-700" },
  { href: "/notifications",label: "Alerts",      Icon: Bell,         bg: "bg-rose-100",    fg: "text-rose-700" },
  { href: "/documents",    label: "Documents",   Icon: FileText,     bg: "bg-lime-100",    fg: "text-lime-700" },
];

const ANN_VARIANT: Record<string, "default" | "warning" | "urgent"> = {
  info: "default", warning: "warning", urgent: "urgent",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResidentDashboard() {
  const { user } = useAuth();
  const { data: estate } = useEstate();
  const firstName = (user?.name ?? "").split(" ")[0];

  const { data: tickets = [] } = useQuery<MaintenanceTicket[]>({
    queryKey: ["maintenance", "my"],
    queryFn: () => api.get<MaintenanceTicket[]>("/api/maintenance/my").then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });

  const { data: parcels = [] } = useQuery<Parcel[]>({
    queryKey: ["parcels", "my"],
    queryFn: () => api.get<Parcel[]>("/api/parcels/my").then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => api.get<Notification[]>("/api/notifications").then((r) => r.data),
    staleTime: 60 * 1000,
  });

  const { data: announcements = [], isLoading: loadingAnn } = useQuery<Announcement[]>({
    queryKey: ["announcements"],
    queryFn: () => api.get<Announcement[]>("/api/announcements").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const openTickets = tickets.filter((t) => t.status !== "resolved" && t.status !== "closed").length;
  const atGate      = parcels.filter((p) => p.status === "at_gate").length;
  const unread      = notifications.filter((n) => !n.read).length;
  const latestAnn   = announcements.slice(0, 3);
  const hasAlert    = atGate > 0 || unread > 0;

  return (
    <div className="page-wrap" data-bottomnav="true">
      <TopBar />

      <main className="container-app pt-5 pb-6 space-y-5 page-content">

        {/* ── Role banner ────────────────────────────────────── */}
        <RoleBanner role="resident" />

        {/* ── Hero ─────────────────────────────────────────────── */}
        <div className="kitenge-hero rounded-2xl p-5 relative overflow-hidden">
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div>
              <p className="text-brand-gold text-sm font-medium">{greeting()},</p>
              <h1 className="font-display font-extrabold text-2xl text-white tracking-tight">
                {firstName}
              </h1>
              <p className="font-serif italic text-base text-white/70 mt-0.5">
                {estate
                  ? `${estate.name}${user?.unitNumber ? ` · Unit ${user.unitNumber}` : ""}`
                  : "Welcome to JiraniHub"}
              </p>
            </div>
            {hasAlert && (
              <div className="shrink-0 bg-brand-gold rounded-xl px-3 py-1.5 text-white text-xs font-bold whitespace-nowrap">
                {atGate > 0
                  ? `📦 ${atGate} parcel${atGate > 1 ? "s" : ""} at gate`
                  : `🔔 ${unread} alert${unread > 1 ? "s" : ""}`}
              </div>
            )}
          </div>
          <div className="mt-4 flag-bar w-24 relative z-10" />
        </div>

        {/* ── Weather & Traffic ───────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <WeatherWidget />
          <TrafficWidget />
        </div>

        {/* ── My Status (KPI tiles) ───────────────────────────── */}
        <section>
          <SectionTitle icon={<Activity className="h-4 w-4" />}>My Status</SectionTitle>
          <div className="grid grid-cols-3 gap-2.5">
            <KpiTile
              label="Open Issues"
              value={openTickets}
              tone={openTickets > 0 ? "gold" : "neutral"}
              icon={<Wrench className="h-4 w-4" />}
              href="/maintenance"
            />
            <KpiTile
              label="At Gate"
              value={atGate}
              tone={atGate > 0 ? "gold" : "neutral"}
              icon={<PackageCheck className="h-4 w-4" />}
              href="/parcels"
            />
            <KpiTile
              label="Alerts"
              value={unread}
              tone={unread > 0 ? "red" : "neutral"}
              icon={<Bell className="h-4 w-4" />}
              href="/notifications"
            />
          </div>
        </section>

        {/* ── Quick Actions ────────────────────────────────────── */}
        <section>
          <SectionTitle>Quick Actions</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <ActionTile href="/maintenance" tone="amber" icon={<Wrench className="h-5 w-5" />}     label="Report Issue"   desc="Plumbing, electrical, roads…" />
            <ActionTile href="/visitors"    tone="green" icon={<Users className="h-5 w-5" />}      label="Invite Visitor" desc="Generate a gate pass" />
            <ActionTile href="/payments"    tone="gold"  icon={<CreditCard className="h-5 w-5" />} label="Pay Levy"       desc="Service charge via M-PESA" />
            <ActionTile href="/emergency"   tone="red"   icon={<ShieldAlert className="h-5 w-5" />}label="Emergency"      desc="Raise an estate alert" />
          </div>
        </section>

        {/* ── From Management ──────────────────────────────────── */}
        <section>
          <SectionTitle
            icon={<Megaphone className="h-4 w-4" />}
            action={
              <Link href="/announcements" className="text-xs text-brand-green font-semibold hover:underline">
                View all →
              </Link>
            }
          >
            From Management
          </SectionTitle>

          {loadingAnn ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="tribal-card p-4 animate-pulse">
                  <div className="h-3 bg-tribal-border rounded w-1/4 mb-2" />
                  <div className="h-4 bg-tribal-border rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : latestAnn.length === 0 ? (
            <div className="tribal-card p-6 text-center">
              <Megaphone className="h-8 w-8 text-tribal-border mx-auto mb-2" />
              <p className="text-tribal-earth text-sm font-medium">No announcements yet.</p>
              <p className="text-tribal-earth text-xs mt-1 opacity-70">Management notices will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {latestAnn.map((ann) => (
                <Link key={ann.id} href="/announcements">
                  <div
                    className={`tribal-card px-4 py-3 flex items-start justify-between gap-2 hover:shadow-card-lg transition-shadow ${
                      ann.priority === "urgent" ? "border-l-4 border-l-brand-red" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {ann.priority === "urgent" && <AlertCircle className="h-3.5 w-3.5 text-brand-red shrink-0" />}
                        <Badge variant={ANN_VARIANT[ann.priority] ?? "default"}>{ann.priority}</Badge>
                      </div>
                      <p className="font-semibold text-sm text-tribal-charcoal truncate">{ann.title}</p>
                      <p className="text-xs text-tribal-earth mt-0.5">{formatRelative(ann.createdAt)}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-tribal-muted shrink-0 mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── More Services ────────────────────────────────────── */}
        <section>
          <SectionTitle>More Services</SectionTitle>
          <div className="grid grid-cols-4 gap-2">
            {MORE_TILES.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border border-tribal-border-soft bg-white hover:border-brand-green/30 hover:shadow-card transition-all"
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
      </main>

      <BottomNav />
    </div>
  );
}
