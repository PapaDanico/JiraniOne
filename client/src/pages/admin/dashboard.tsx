import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Users, Wrench, Megaphone, AlertCircle, Clock, CheckCircle,
  CreditCard, CalendarDays, Vote, BookOpen, Store, ShieldAlert, UserCog,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEstate } from "@/hooks/useEstate";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { SectionLoader } from "@/components/shared/loading";

interface TicketStats { open: number; overdue: number; inProgress: number }

const modules = [
  { href: "/visitors",     label: "Visitors",    icon: <Users className="h-5 w-5" />,       color: "text-blue-600 bg-blue-50" },
  { href: "/maintenance",  label: "Tickets",     icon: <Wrench className="h-5 w-5" />,      color: "text-orange-600 bg-orange-50" },
  { href: "/announcements",label: "Notices",     icon: <Megaphone className="h-5 w-5" />,   color: "text-purple-600 bg-purple-50" },
  { href: "/payments",     label: "Payments",    icon: <CreditCard className="h-5 w-5" />,  color: "text-green-600 bg-green-50" },
  { href: "/emergency",    label: "Emergency",   icon: <ShieldAlert className="h-5 w-5" />, color: "text-red-600 bg-red-50" },
  { href: "/events",       label: "Events",      icon: <CalendarDays className="h-5 w-5" />,color: "text-cyan-600 bg-cyan-50" },
  { href: "/governance",   label: "Governance",  icon: <Vote className="h-5 w-5" />,        color: "text-indigo-600 bg-indigo-50" },
  { href: "/bookings",     label: "Bookings",    icon: <BookOpen className="h-5 w-5" />,    color: "text-pink-600 bg-pink-50" },
  { href: "/marketplace",  label: "Marketplace", icon: <Store className="h-5 w-5" />,       color: "text-amber-600 bg-amber-50" },
  { href: "/admin/users",  label: "Residents",   icon: <UserCog className="h-5 w-5" />,     color: "text-slate-600 bg-slate-50" },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data: estate } = useEstate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["maintenance", "stats"],
    queryFn: () => api.get<TicketStats>("/api/maintenance/stats").then((r) => r.data),
  });

  return (
    <div className="min-h-screen bg-white pb-20">
      <TopBar title="Admin" />

      <main className="max-w-lg mx-auto px-4 pt-4 pb-6 space-y-6">
        <div>
          <h1 className="font-['Plus_Jakarta_Sans'] font-bold text-2xl text-gray-900">
            Admin Panel
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{user?.name} · {estate?.name ?? "Loading…"}</p>
        </div>

        {/* Maintenance stats */}
        <div>
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">Maintenance</h2>
          {isLoading ? (
            <SectionLoader />
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Open", value: stats?.open ?? 0, icon: <AlertCircle className="h-3 w-3" />, color: "text-orange-600" },
                { label: "Overdue", value: stats?.overdue ?? 0, icon: <Clock className="h-3 w-3" />, color: "text-red-600" },
                { label: "Active", value: stats?.inProgress ?? 0, icon: <CheckCircle className="h-3 w-3" />, color: "text-[#1A5C38]" },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="py-3 px-4 text-center">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
                      {s.icon} {s.label}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Module grid */}
        <div>
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">All Modules</h2>
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
      </main>

      <BottomNav />
    </div>
  );
}
