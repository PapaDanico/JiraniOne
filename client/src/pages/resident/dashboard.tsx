import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Wrench, Megaphone, ShieldAlert, CreditCard,
  CalendarDays, Store, Vote, BookOpen, ChevronRight,
  Package, Tag, Users, Bell, PackageCheck, AlertCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEstate } from "@/hooks/useEstate";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { Badge } from "@/components/ui/badge";
import { WeatherWidget, TrafficWidget } from "@/components/shared/weather-traffic";
import { api } from "@/lib/api";
import { SectionLoader } from "@/components/shared/loading";
import { formatRelative } from "@/lib/utils";
import type { Announcement, MaintenanceTicket, Notification, Parcel } from "@shared/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const priorityVariant: Record<string, "default" | "warning" | "urgent"> = {
  info:    "default",
  warning: "warning",
  urgent:  "urgent",
};

// ─── Status chip ──────────────────────────────────────────────────────────────

function StatusChip({
  icon, label, value, href, highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link href={href}>
      <div className={`flex flex-col items-center justify-center gap-1 rounded-2xl p-3 border transition-all text-center
        ${highlight
          ? "bg-[#D47A00]/10 border-[#D47A00]/30 hover:bg-[#D47A00]/15"
          : "bg-[#EDE7D8] border-[#D4C9A8] hover:border-[#1B5E20]/30 hover:bg-[#E4DCC8]"
        }`}
      >
        <span className={highlight ? "text-[#D47A00]" : "text-[#6B5D45]"}>{icon}</span>
        <span className={`text-xl font-black leading-none ${highlight ? "text-[#D47A00]" : "text-[#212121]"}`}>
          {value}
        </span>
        <span className="text-[10px] font-semibold text-[#6B5D45] leading-tight">{label}</span>
      </div>
    </Link>
  );
}

// ─── Quick-action tile ────────────────────────────────────────────────────────

function ActionTile({
  href, icon, label, desc, bg, urgent = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
  bg: string;
  urgent?: boolean;
}) {
  return (
    <Link href={href}>
      <div className={`flex flex-col justify-between rounded-2xl p-4 min-h-[112px] text-white border transition-opacity hover:opacity-90 active:scale-95
        ${bg} ${urgent ? "border-white/20" : "border-transparent"}`}
      >
        <div className="p-2 bg-white/15 rounded-xl w-fit">{icon}</div>
        <div className="mt-2">
          <p className="font-bold text-sm leading-tight">{label}</p>
          <p className="text-xs opacity-70 mt-0.5 leading-tight">{desc}</p>
        </div>
      </div>
    </Link>
  );
}

// ─── Secondary module grid ────────────────────────────────────────────────────

const MORE_MODULES = [
  { href: "/parcels",     label: "Parcels",     icon: <Package className="h-5 w-5" />,     bg: "bg-sky-100",       fg: "text-sky-700" },
  { href: "/classifieds", label: "Noticeboard", icon: <Tag className="h-5 w-5" />,         bg: "bg-[#1B5E20]/10",  fg: "text-[#1B5E20]" },
  { href: "/events",      label: "Events",      icon: <CalendarDays className="h-5 w-5" />,bg: "bg-cyan-100",      fg: "text-cyan-700" },
  { href: "/visitors",    label: "Visitors",    icon: <Users className="h-5 w-5" />,       bg: "bg-[#1B5E20]/10",  fg: "text-[#1B5E20]" },
  { href: "/governance",  label: "Governance",  icon: <Vote className="h-5 w-5" />,        bg: "bg-indigo-100",    fg: "text-indigo-700" },
  { href: "/bookings",    label: "Bookings",    icon: <BookOpen className="h-5 w-5" />,    bg: "bg-pink-100",      fg: "text-pink-700" },
  { href: "/marketplace", label: "Marketplace", icon: <Store className="h-5 w-5" />,       bg: "bg-amber-100",     fg: "text-amber-700" },
  { href: "/announcements",label:"Notices",     icon: <Megaphone className="h-5 w-5" />,   bg: "bg-purple-100",    fg: "text-purple-700" },
];

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function ResidentDashboard() {
  const { user } = useAuth();
  const { data: estate } = useEstate();
  const firstName = user?.name.split(" ")[0] ?? "";

  // My maintenance tickets
  const { data: ticketsRes } = useQuery({
    queryKey: ["maintenance", "my"],
    queryFn: () => api.get<MaintenanceTicket[]>("/api/maintenance/my").then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });

  // My parcels
  const { data: parcelsRes } = useQuery({
    queryKey: ["parcels", "my"],
    queryFn: () => api.get<{ data: Parcel[] }>("/api/parcels/my").then((r) => r.data.data),
    staleTime: 2 * 60 * 1000,
  });

  // Notifications
  const { data: notifRes } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<Notification[]>("/api/notifications").then((r) => r.data),
    staleTime: 60 * 1000,
  });

  // Announcements
  const { data: announcementsRes, isLoading: loadingAnn } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => api.get<Announcement[]>("/api/announcements").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  // Derived counts
  const openTickets   = ticketsRes?.filter((t) => t.status !== "resolved" && t.status !== "closed").length ?? 0;
  const parcelsAtGate = parcelsRes?.filter((p) => p.status === "at_gate").length ?? 0;
  const unreadNotifs  = notifRes?.filter((n) => !n.read).length ?? 0;
  const latestAnn     = announcementsRes?.slice(0, 3) ?? [];

  const hasAlerts = parcelsAtGate > 0 || unreadNotifs > 0;

  return (
    <div className="page-wrap">
      <TopBar />

      <main className="max-w-lg mx-auto px-4 pt-5 pb-6 space-y-5 page-content">

        {/* ── Hero greeting ──────────────────────────────────────────── */}
        <div className="kitenge-hero rounded-2xl p-5 relative overflow-hidden">
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-[#D4A017] text-sm font-medium mb-0.5">{timeGreeting()},</p>
              <h1 className="font-bold text-2xl text-white tracking-tight">{firstName}! 👋</h1>
              <p className="text-white/60 text-sm mt-1">
                {estate
                  ? `${estate.name}${user?.unitNumber ? ` · Unit ${user.unitNumber}` : ""}`
                  : "Welcome to JiraniHub"}
              </p>
            </div>
            {hasAlerts && (
              <div className="bg-[#D47A00] rounded-xl px-2.5 py-1 shrink-0">
                <p className="text-white text-xs font-bold">
                  {parcelsAtGate > 0 ? `📦 ${parcelsAtGate} parcel${parcelsAtGate > 1 ? "s" : ""} at gate` : `🔔 ${unreadNotifs} alert${unreadNotifs > 1 ? "s" : ""}`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Weather & Traffic ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <WeatherWidget />
          <TrafficWidget />
        </div>

        {/* ── My Status ─────────────────────────────────────────────── */}
        <div>
          <p className="section-label mb-3">My Status</p>
          <div className="grid grid-cols-3 gap-2.5">
            <StatusChip
              icon={<Wrench className="h-4 w-4" />}
              label="Open Issues"
              value={openTickets}
              href="/maintenance"
              highlight={openTickets > 0}
            />
            <StatusChip
              icon={<PackageCheck className="h-4 w-4" />}
              label="At Gate"
              value={parcelsAtGate}
              href="/parcels"
              highlight={parcelsAtGate > 0}
            />
            <StatusChip
              icon={<Bell className="h-4 w-4" />}
              label="Alerts"
              value={unreadNotifs}
              href="/notifications"
              highlight={unreadNotifs > 0}
            />
          </div>
        </div>

        {/* ── Quick Actions ──────────────────────────────────────────── */}
        <div>
          <p className="section-label mb-3">Quick Actions</p>
          <div className="grid grid-cols-2 gap-3">
            <ActionTile
              href="/maintenance"
              icon={<Wrench className="h-6 w-6" />}
              label="Report Issue"
              desc="Plumbing, electrical, roads…"
              bg="bg-[#D47A00]"
            />
            <ActionTile
              href="/visitors"
              icon={<Users className="h-6 w-6" />}
              label="Invite Visitor"
              desc="Generate a gate pass"
              bg="bg-[#1B5E20]"
            />
            <ActionTile
              href="/payments"
              icon={<CreditCard className="h-6 w-6" />}
              label="Pay Levy"
              desc="Service charge & M-PESA"
              bg="bg-[#9A6E00]"
            />
            <ActionTile
              href="/emergency"
              icon={<ShieldAlert className="h-6 w-6" />}
              label="Emergency"
              desc="Raise an estate alert"
              bg="bg-[#B71C1C]"
              urgent
            />
          </div>
        </div>

        {/* ── Latest Announcements ───────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">From Management</p>
            <Link href="/announcements" className="text-xs text-[#1B5E20] font-semibold hover:underline">
              View all →
            </Link>
          </div>

          {loadingAnn ? (
            <SectionLoader />
          ) : latestAnn.length === 0 ? (
            <div className="tribal-card p-6 text-center">
              <Megaphone className="h-8 w-8 text-[#D4C9A8] mx-auto mb-2" />
              <p className="text-[#6B5D45] text-sm">No announcements yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {latestAnn.map((a) => (
                <Link key={a.id} href="/announcements">
                  <div className={`tribal-card px-4 py-3 flex items-start justify-between gap-2 hover:border-[#1B5E20]/30 transition-colors
                    ${a.priority === "urgent" ? "border-[#B71C1C]/30 bg-[#B71C1C]/5" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={priorityVariant[a.priority] ?? "default"}>
                          {a.priority}
                        </Badge>
                      </div>
                      <p className="font-semibold text-sm text-[#212121] truncate">{a.title}</p>
                      <p className="text-xs text-[#6B5D45] mt-0.5">{formatRelative(a.createdAt)}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#D4C9A8] shrink-0 mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── More Services ─────────────────────────────────────────── */}
        <div>
          <p className="section-label mb-3">More Services</p>
          <div className="grid grid-cols-4 gap-2">
            {MORE_MODULES.map((m) => (
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
        </div>

      </main>

      <BottomNav />
    </div>
  );
}
