import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Users, Wrench, Megaphone, ShieldAlert, CreditCard,
  CalendarDays, Store, Vote, BookOpen, ChevronRight, Bell,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEstate } from "@/hooks/useEstate";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { SectionLoader } from "@/components/shared/loading";
import { formatRelative } from "@/lib/utils";
import type { Announcement, Notification } from "@shared/types";

const modules = [
  { href: "/visitors",    label: "Visitors",      icon: <Users className="h-6 w-6" />,       bg: "bg-[#1B5E20]/10",   fg: "text-[#1B5E20]" },
  { href: "/maintenance", label: "Maintenance",   icon: <Wrench className="h-6 w-6" />,      bg: "bg-[#D47A00]/10",   fg: "text-[#D47A00]" },
  { href: "/announcements",label: "Notices",      icon: <Megaphone className="h-6 w-6" />,   bg: "bg-purple-100",     fg: "text-purple-700" },
  { href: "/emergency",   label: "Emergency",     icon: <ShieldAlert className="h-6 w-6" />, bg: "bg-[#B71C1C]/10",   fg: "text-[#B71C1C]" },
  { href: "/payments",    label: "Payments",      icon: <CreditCard className="h-6 w-6" />,  bg: "bg-[#D4A017]/15",   fg: "text-[#9A6E00]" },
  { href: "/events",      label: "Events",        icon: <CalendarDays className="h-6 w-6" />,bg: "bg-cyan-100",       fg: "text-cyan-700" },
  { href: "/marketplace", label: "Marketplace",   icon: <Store className="h-6 w-6" />,       bg: "bg-amber-100",      fg: "text-amber-700" },
  { href: "/governance",  label: "Governance",    icon: <Vote className="h-6 w-6" />,        bg: "bg-indigo-100",     fg: "text-indigo-700" },
  { href: "/bookings",    label: "Bookings",      icon: <BookOpen className="h-6 w-6" />,    bg: "bg-pink-100",       fg: "text-pink-700" },
];

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

export default function ResidentDashboard() {
  const { user } = useAuth();
  const { data: estate } = useEstate();

  const { data: announcements, isLoading: loadingAnn } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => api.get<Announcement[]>("/api/announcements").then((r) => r.data),
  });

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<Notification[]>("/api/notifications").then((r) => r.data),
  });

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;
  const latestAnnouncements = announcements?.slice(0, 3) ?? [];
  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <div className="page-wrap">
      <TopBar />

      <main className="max-w-lg mx-auto px-4 pt-5 pb-6 space-y-6 page-content">
        {/* Greeting card */}
        <div className="kitenge-hero rounded-2xl p-5 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[#D4A017] text-sm font-medium mb-0.5">{timeGreeting()},</p>
            <h1 className="font-bold text-2xl text-white tracking-tight">
              {firstName}! 👋
            </h1>
            <p className="text-white/60 text-sm mt-1">
              {estate
                ? `${estate.name}${user?.unitNumber ? ` · Unit ${user.unitNumber}` : ""}`
                : "Welcome to JiraniHub"}
            </p>
          </div>
        </div>

        {/* Notification banner */}
        {unreadCount > 0 && (
          <Link href="/notifications">
            <div className="bg-[#1B5E20]/8 border border-[#1B5E20]/20 rounded-2xl px-4 py-3 flex items-center justify-between hover:bg-[#1B5E20]/12 transition-colors">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#1B5E20]" />
                <span className="text-sm text-[#1B5E20] font-semibold">
                  {unreadCount} new notification{unreadCount !== 1 ? "s" : ""}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#1B5E20]/60" />
            </div>
          </Link>
        )}

        {/* Module grid */}
        <div>
          <p className="section-label mb-3">All Modules</p>
          <div className="grid grid-cols-3 gap-3">
            {modules.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-[#D4C9A8] bg-[#EDE7D8] hover:border-[#1B5E20]/30 hover:bg-[#E4DCC8] transition-all min-h-[84px] justify-center"
              >
                <div className={`rounded-xl p-2.5 ${m.bg}`}>
                  <span className={m.fg}>{m.icon}</span>
                </div>
                <span className="text-xs font-semibold text-[#212121] text-center leading-tight">{m.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Latest announcements */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">Latest Announcements</p>
            <Link href="/announcements" className="text-xs text-[#1B5E20] font-semibold hover:underline">
              View all →
            </Link>
          </div>
          {loadingAnn ? (
            <SectionLoader />
          ) : latestAnnouncements.length === 0 ? (
            <div className="tribal-card p-8 text-center">
              <Megaphone className="h-10 w-10 text-[#D4C9A8] mx-auto mb-2" />
              <p className="text-[#6B5D45] text-sm">No announcements yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {latestAnnouncements.map((a) => (
                <Card key={a.id} className={a.priority === "urgent" ? "border-[#B71C1C]/30 bg-[#B71C1C]/5" : ""}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2">
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
