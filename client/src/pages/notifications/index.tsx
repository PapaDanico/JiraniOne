import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { Button } from "@/components/ui/button";
import { SectionLoader } from "@/components/shared/loading";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Notification } from "@shared/types";

const TYPE_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  ticket_update:   { label: "Maintenance", color: "bg-[#D47A00]/10 text-[#D47A00]",   emoji: "🔧" },
  visitor_checkin: { label: "Visitor",     color: "bg-[#1B5E20]/10 text-[#1B5E20]",   emoji: "🚪" },
  payment:         { label: "Payment",     color: "bg-[#D4A017]/10 text-[#9A6E00]",   emoji: "💳" },
  emergency:       { label: "Emergency",   color: "bg-[#B71C1C]/10 text-[#B71C1C]",   emoji: "🚨" },
  announcement:    { label: "Announcement",color: "bg-[#6B5D45]/10 text-[#6B5D45]",   emoji: "📢" },
};

export default function NotificationsPage() {
  const qc = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<Notification[]>("/api/notifications").then((r) => r.data),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/api/notifications/${id}/read`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch("/api/notifications/read-all", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <div className="page-wrap">
      <TopBar title="Notifications" />
      <main className="max-w-lg mx-auto px-4 pt-4 page-content">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <p className="section-label">My Notifications</p>
            {unreadCount > 0 && (
              <span className="text-xs bg-[#B71C1C] text-white rounded-full px-2 py-0.5 font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => markAllRead.mutate()}
              loading={markAllRead.isPending}
              className="text-xs text-[#1B5E20] gap-1"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </Button>
          )}
        </div>

        {isLoading ? (
          <SectionLoader />
        ) : !notifications?.length ? (
          <div className="tribal-card p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#1B5E20]/10 flex items-center justify-center mx-auto mb-3">
              <Bell className="h-7 w-7 text-[#1B5E20]" />
            </div>
            <p className="font-semibold text-[#212121] mb-1">No notifications</p>
            <p className="text-[#6B5D45] text-sm">You're all caught up — great!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const cfg = TYPE_CONFIG[n.type] ?? { label: n.type, color: "bg-[#EDE7D8] text-[#6B5D45]", emoji: "📋" };
              return (
                <button
                  key={n.id}
                  className={cn(
                    "w-full text-left rounded-2xl border px-4 py-3 transition-colors",
                    n.read
                      ? "border-[#D4C9A8] bg-[#EDE7D8]"
                      : "border-[#1B5E20]/25 bg-[#1B5E20]/5",
                  )}
                  onClick={() => !n.read && markRead.mutate(n.id)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl shrink-0 mt-0.5">{cfg.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className={cn("text-sm", n.read ? "text-[#6B5D45]" : "font-semibold text-[#212121]")}>
                        {n.title}
                      </p>
                      <p className="text-sm text-[#6B5D45] mt-0.5">{n.body}</p>
                      <p className="text-xs text-[#D4C9A8] mt-1">{formatRelative(n.createdAt)}</p>
                    </div>
                    {!n.read && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#1B5E20] shrink-0 mt-1.5" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
