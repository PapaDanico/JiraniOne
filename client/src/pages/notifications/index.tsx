import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionLoader } from "@/components/shared/loading";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Notification } from "@shared/types";

const typeColor: Record<string, string> = {
  ticket_update: "bg-orange-100 text-orange-700",
  visitor_checkin: "bg-blue-100 text-blue-700",
  payment: "bg-green-100 text-green-700",
  emergency: "bg-red-100 text-red-700",
  announcement: "bg-purple-100 text-purple-700",
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
    <div className="min-h-screen bg-white pb-20">
      <TopBar title="Notifications" />
      <main className="max-w-lg mx-auto px-4 pt-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-semibold text-gray-900">
            Notifications{unreadCount > 0 && (
              <span className="ml-2 text-xs bg-[#1A5C38] text-white rounded-full px-2 py-0.5">
                {unreadCount}
              </span>
            )}
          </h1>
          {unreadCount > 0 && (
            <Button
              size="sm" variant="ghost"
              onClick={() => markAllRead.mutate()}
              loading={markAllRead.isPending}
              className="text-xs text-[#1A5C38]"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark all read
            </Button>
          )}
        </div>

        {isLoading ? (
          <SectionLoader />
        ) : !notifications?.length ? (
          <div className="text-center py-16">
            <Bell className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">You're all caught up.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                className={cn(
                  "w-full text-left rounded-xl border px-4 py-3 transition-colors",
                  n.read
                    ? "border-[#E8E6E3] bg-white"
                    : "border-[#1A5C38]/20 bg-[#1A5C38]/5",
                )}
                onClick={() => !n.read && markRead.mutate(n.id)}
              >
                <div className="flex items-start gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 mt-0.5 ${typeColor[n.type] ?? "bg-gray-100 text-gray-600"}`}>
                    {n.type.replace(/_/g, " ")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm", n.read ? "text-gray-700" : "font-semibold text-gray-900")}>
                      {n.title}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">{n.body}</p>
                    <p className="text-xs text-gray-300 mt-1">{formatRelative(n.createdAt)}</p>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-[#1A5C38] shrink-0 mt-1.5" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
