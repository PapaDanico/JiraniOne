import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Wrench, ShieldAlert, CreditCard,
  CalendarDays, Store, Vote, BookOpen,
  Package, Tag, Users, Bell, PackageCheck,
  Megaphone, ChevronRight, AlertCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEstate } from "@/hooks/useEstate";
import { TopBar, BottomNav } from "@/components/shared/navigation";
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

function StatusChip({
  icon, label, value, href, amber = false,
}: {
  icon: React.ReactNode; label: string; value: number;
  href: string; amber?: boolean;
}) {
  return (
    <Link href={href}>
      <div className={`flex flex-col items-center justify-center gap-1 rounded-2xl p-3 border text-center transition-all
        ${amber && value > 0
          ? "bg-amber-50 border-amber-300 hover:bg-amber-100"
          : "bg-[#EDE7D8] border-[#D4C9A8] hover:border-[#1B5E20]/30"}`}
      >
        <span className={amber && value > 0 ? "text-amber-600" : "text-[#6B5D45]"}>{icon}</span>
        <span className={`text-xl font-black leading-none ${amber && value > 0 ? "text-amber-700" : "text-[#212121]"}`}>
          {value}
        </span>
        <span className="text-[10px] font-semibold text-[#6B5D45] leading-tight">{label}</span>
      </div>
    </Link>
  );
}

function ActionTile({
  href, icon, label, desc, bg,
}: {
  href: string; icon: React.ReactNode; label: string; desc: string; bg: string;
}) {
  return (
    <Link href={href}>
      <div className={`flex flex-col justify-between rounded-2xl p-4 min-h-[112px] text-white transition-opacity hover:opacity-90 active:scale-[0.98] ${bg}`}>
        <div className="p-2 bg-white/20 rounded-xl w-fit">{icon}</div>
        <div className="mt-2">
          <p className="font-bold text-sm leading-tight">{label}</p>
          <p className="text-[11px] opacity-70 mt-0.5 leading-tight">{desc}</p>
        </div>
      </div>
    </Link>
  );
}

const MORE = [
  { href: "/parcels",      label: "Parcels",     icon: <Package className="h-5 w-5" />,      bg: "bg-sky-100",       fg: "text-sky-700" },
  { href: "/classifieds",  label: "Noticeboard", icon: <Tag className="h-5 w-5" />,          bg: "bg-green-100",     fg: "text-green-800" },
  { href: "/events",       label: "Events",      icon: <CalendarDays className="h-5 w-5" />, bg: "bg-cyan-100",      fg: "text-cyan-700" },
  { href: "/visitors",     label: "Visitors",    icon: <Users className="h-5 w-5" />,        bg: "bg-indigo-100",    fg: "text-indigo-700" },
  { href: "/governance",   label: "Governance",  icon: <Vote className="h-5 w-5" />,         bg: "bg-purple-100",    fg: "text-purple-700" },
  { href: "/bookings",     label: "Bookings",    icon: <BookOpen className="h-5 w-5" />,     bg: "bg-pink-100",      fg: "text-pink-700" },
  { href: "/marketplace",  label: "Marketplace", icon: <Store className="h-5 w-5" />,        bg: "bg-amber-100",     fg: "text-amber-700" },
  { href: "/notifications", label: "Alerts",      icon: <Bell className="h-5 w-5" />,        bg: "bg-rose-100",      fg: "text-rose-700" },
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

  const openTickets   = tickets.filter((t) => t.status !== "resolved" && t.status !== "closed").length;
  const atGate        = parcels.filter((p) => p.status === "at_gate").length;
  const unread        = notifications.filter((n) => !n.read).length;
  const latestAnn     = announcements.slice(0, 3);
  const hasAlert      = atGate > 0 || unread > 0;

  return (
    <div className="page-wrap">
      <TopBar />

      <main className="max-w-lg mx-auto px-4 pt-5 pb-6 space-y-5 page-content">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="kitenge-hero rounded-2xl p-5 relative overflow-hidden">
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div>
              <p className="text-[#D4A017] text-sm font-medium">{greeting()},</p>
              <h1 className="font-bold text-2xl text-white tracking-tight">{firstName} 👋</h1>
              <p className="text-white/60 text-sm mt-1">
                {estate
                  ? `${estate.name}${user?.unitNumber ? ` · Unit ${user.unitNumber}` : ""}`
                  : "Welcome to JiraniHub"}
              </p>
            </div>
            {hasAlert && (
              <div className="shrink-0 bg-amber-500 rounded-xl px-3 py-1.5 text-white text-xs font-bold whitespace-nowrap">
                {atGate > 0
                  ? `📦 ${atGate} parcel${atGate > 1 ? "s" : ""} at gate`
                  : `🔔 ${unread} alert${unread > 1 ? "s" : ""}`}
              </div>
            )}
          </div>
        </div>

        {/* ── Weather & Traffic ──────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <WeatherWidget />
          <TrafficWidget />
        </div>

        {/* ── My Status ─────────────────────────────────────────── */}
        <section>
          <p className="section-label mb-3">My Status</p>
          <div className="grid grid-cols-3 gap-2.5">
            <StatusChip icon={<Wrench className="h-4 w-4" />}      label="Open Issues" value={openTickets} href="/maintenance" amber />
            <StatusChip icon={<PackageCheck className="h-4 w-4" />} label="At Gate"     value={atGate}     href="/parcels"     amber />
            <StatusChip icon={<Bell className="h-4 w-4" />}         label="Alerts"      value={unread}      href="/notifications" amber />
          </div>
        </section>

        {/* ── Quick Actions ──────────────────────────────────────── */}
        <section>
          <p className="section-label mb-3">Quick Actions</p>
          <div className="grid grid-cols-2 gap-3">
            <ActionTile href="/maintenance" icon={<Wrench className="h-5 w-5" />}     label="Report Issue"   desc="Plumbing, electrical, roads…" bg="bg-[#D47A00]" />
            <ActionTile href="/visitors"    icon={<Users className="h-5 w-5" />}      label="Invite Visitor" desc="Generate a gate pass"          bg="bg-[#1B5E20]" />
            <ActionTile href="/payments"    icon={<CreditCard className="h-5 w-5" />} label="Pay Levy"       desc="Service charge via M-PESA"     bg="bg-[#9A6E00]" />
            <ActionTile href="/emergency"   icon={<ShieldAlert className="h-5 w-5" />}label="Emergency"      desc="Raise an estate alert"         bg="bg-[#B71C1C]" />
          </div>
        </section>

        {/* ── From Management ───────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">From Management</p>
            <Link href="/announcements" className="text-xs text-[#1B5E20] font-semibold hover:underline">
              View all →
            </Link>
          </div>

          {loadingAnn ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="tribal-card p-4 animate-pulse">
                  <div className="h-3 bg-[#D4C9A8] rounded w-1/4 mb-2" />
                  <div className="h-4 bg-[#D4C9A8] rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : latestAnn.length === 0 ? (
            <div className="tribal-card p-6 text-center">
              <Megaphone className="h-8 w-8 text-[#D4C9A8] mx-auto mb-2" />
              <p className="text-[#6B5D45] text-sm font-medium">No announcements yet.</p>
              <p className="text-[#6B5D45] text-xs mt-1 opacity-70">Management notices will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {latestAnn.map((ann) => (
                <Link key={ann.id} href="/announcements">
                  <div className={`tribal-card px-4 py-3 flex items-start justify-between gap-2 hover:border-[#1B5E20]/30 transition-colors
                    ${ann.priority === "urgent" ? "border-red-200 bg-red-50/50" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {ann.priority === "urgent" && <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                        <Badge variant={ANN_VARIANT[ann.priority] ?? "default"}>{ann.priority}</Badge>
                      </div>
                      <p className="font-semibold text-sm text-[#212121] truncate">{ann.title}</p>
                      <p className="text-xs text-[#6B5D45] mt-0.5">{formatRelative(ann.createdAt)}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#D4C9A8] shrink-0 mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── More Services ─────────────────────────────────────── */}
        <section>
          <p className="section-label mb-3">More Services</p>
          <div className="grid grid-cols-4 gap-2">
            {MORE.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border border-[#D4C9A8] bg-[#EDE7D8] hover:border-[#1B5E20]/30 hover:bg-[#E4DCC8] transition-all"
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
