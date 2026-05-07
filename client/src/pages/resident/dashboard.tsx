import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Users, Wrench, Megaphone, ShieldAlert,
  CreditCard, CalendarDays, Store, Vote, BookOpen,
  ChevronRight,
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
  { href: "/visitors", label: "Visitors", icon: <Users className="h-6 w-6" />, color: "bg-blue-50 text-blue-600" },
  { href: "/maintenance", label: "Maintenance", icon: <Wrench className="h-6 w-6" />, color: "bg-orange-50 text-orange-600" },
  { href: "/announcements", label: "Notices", icon: <Megaphone className="h-6 w-6" />, color: "bg-purple-50 text-purple-600" },
  { href: "/emergency", label: "Emergency", icon: <ShieldAlert className="h-6 w-6" />, color: "bg-red-50 text-red-600" },
  { href: "/payments", label: "Payments", icon: <CreditCard className="h-6 w-6" />, color: "bg-green-50 text-green-600" },
  { href: "/events", label: "Events", icon: <CalendarDays className="h-6 w-6" />, color: "bg-cyan-50 text-cyan-600" },
  { href: "/marketplace", label: "Marketplace", icon: <Store className="h-6 w-6" />, color: "bg-amber-50 text-amber-600" },
  { href: "/governance", label: "Governance", icon: <Vote className="h-6 w-6" />, color: "bg-indigo-50 text-indigo-600" },
  { href: "/bookings", label: "Bookings", icon: <BookOpen className="h-6 w-6" />, color: "bg-pink-50 text-pink-600" },
];

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

  const priorityVariant: Record<string, "default" | "warning" | "urgent"> = {
    info: "default",
    warning: "warning",
    urgent: "urgent",
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      <TopBar />

      <main className="max-w-lg mx-auto px-4 pt-4 pb-6 space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="font-['Plus_Jakarta_Sans'] font-bold text-2xl text-gray-900">
            Habari, {user?.name.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {estate ? `${estate.name}${user?.unitNumber ? ` · Unit ${user.unitNumber}` : ""}` : "Welcome to JiraniHub"}
          </p>
        </div>

        {/* Notification banner */}
        {unreadCount > 0 && (
          <div className="bg-[#1A5C38]/5 border border-[#1A5C38]/20 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-[#1A5C38] font-medium">
              {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
            </span>
            <Link href="/notifications" className="text-xs text-[#1A5C38] underline">View</Link>
          </div>
        )}

        {/* Module grid */}
        <div>
          <h2 className="font-semibold text-gray-700 text-sm mb-3 uppercase tracking-wide">Quick Access</h2>
          <div className="grid grid-cols-3 gap-3">
            {modules.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[#E8E6E3] bg-[#F8F7F5] hover:border-[#1A5C38]/30 transition-colors min-h-[80px] justify-center"
              >
                <div className={`rounded-xl p-2 ${m.color}`}>{m.icon}</div>
                <span className="text-xs font-medium text-gray-700 text-center">{m.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Latest announcements */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Notices</h2>
            <Link href="/announcements" className="text-xs text-[#1A5C38]">See all</Link>
          </div>
          {loadingAnn ? (
            <SectionLoader />
          ) : latestAnnouncements.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No announcements yet.</p>
          ) : (
            <div className="space-y-2">
              {latestAnnouncements.map((a) => (
                <Card key={a.id}>
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant={priorityVariant[a.priority] ?? "default"}>
                            {a.priority}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm text-gray-900 truncate">{a.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatRelative(a.createdAt)}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300 shrink-0 mt-1" />
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
