import { useAuth } from "@/hooks/useAuth";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { TicketList } from "@/components/maintenance/ticket-list";
import { AdminTickets } from "@/components/maintenance/admin-tickets";

export default function MaintenancePage() {
  const { user } = useAuth();

  return (
    <div className="page-wrap">
      <TopBar title="Matengenezo" />
      <main className="max-w-lg mx-auto px-4 pt-4 page-content">
        {user?.role === "admin" ? <AdminTickets /> : <TicketList />}
      </main>
      <BottomNav />
    </div>
  );
}
