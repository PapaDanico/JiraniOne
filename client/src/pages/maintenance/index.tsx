import { useAuth } from "@/hooks/useAuth";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { TicketList } from "@/components/maintenance/ticket-list";
import { AdminTickets } from "@/components/maintenance/admin-tickets";

export default function MaintenancePage() {
  const { user } = useAuth();

  return (
    <div className="page-wrap">
      <TopBar title="Maintenance" />
      <main className="container-list pt-4 page-content">
        {user?.role === "admin" ? <AdminTickets /> : <TicketList />}
      </main>
      <BottomNav />
    </div>
  );
}
