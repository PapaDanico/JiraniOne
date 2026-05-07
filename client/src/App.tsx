import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { RoleGate } from "@/components/shared/role-gate";
import { PageLoader } from "@/components/shared/loading";

// Pages
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import ResidentDashboard from "@/pages/resident/dashboard";
import AdminDashboard from "@/pages/admin/dashboard";
import SecurityDashboard from "@/pages/security/dashboard";
import VendorDashboard from "@/pages/vendor/dashboard";
import VisitorsPage from "@/pages/visitor/index";
import MaintenancePage from "@/pages/maintenance/index";
import AnnouncementsPage from "@/pages/announcements/index";
import PaymentsPage from "@/pages/payments/index";
import EmergencyPage from "@/pages/emergency/index";
import EventsPage from "@/pages/events/index";
import GovernancePage from "@/pages/governance/index";
import BookingsPage from "@/pages/bookings/index";
import MarketplacePage from "@/pages/marketplace/index";
import RegisterPage from "@/pages/register";
import NotificationsPage from "@/pages/notifications/index";
import AdminUsersPage from "@/pages/admin/users";
import ParcelsPage from "@/pages/parcels/index";
import ClassifiedsPage from "@/pages/classifieds/index";

function AppRoutes() {
  const { user, isLoading } = useAuth();
  useWebSocket(!!user);

  if (isLoading) return <PageLoader />;

  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />

      <Route path="/dashboard/resident">
        <RoleGate roles={["resident"]}><ResidentDashboard /></RoleGate>
      </Route>
      <Route path="/dashboard/admin">
        <RoleGate roles={["admin"]}><AdminDashboard /></RoleGate>
      </Route>
      <Route path="/dashboard/security">
        <RoleGate roles={["security"]}><SecurityDashboard /></RoleGate>
      </Route>
      <Route path="/dashboard/vendor">
        <RoleGate roles={["vendor"]}><VendorDashboard /></RoleGate>
      </Route>

      <Route path="/visitors">
        <RoleGate roles={["resident", "admin", "security"]}><VisitorsPage /></RoleGate>
      </Route>
      <Route path="/maintenance">
        <RoleGate roles={["resident", "admin"]}><MaintenancePage /></RoleGate>
      </Route>
      <Route path="/announcements">
        <RoleGate roles={["resident", "admin", "security"]}><AnnouncementsPage /></RoleGate>
      </Route>
      <Route path="/payments">
        <RoleGate roles={["resident", "admin"]}><PaymentsPage /></RoleGate>
      </Route>
      <Route path="/emergency">
        <RoleGate roles={["resident", "admin", "security"]}><EmergencyPage /></RoleGate>
      </Route>
      <Route path="/events">
        <RoleGate roles={["resident", "admin", "security"]}><EventsPage /></RoleGate>
      </Route>
      <Route path="/governance">
        <RoleGate roles={["resident", "admin"]}><GovernancePage /></RoleGate>
      </Route>
      <Route path="/bookings">
        <RoleGate roles={["resident", "admin"]}><BookingsPage /></RoleGate>
      </Route>
      <Route path="/marketplace">
        <RoleGate roles={["resident", "admin", "vendor"]}><MarketplacePage /></RoleGate>
      </Route>
      <Route path="/notifications">
        <RoleGate roles={["resident", "admin", "security", "vendor"]}><NotificationsPage /></RoleGate>
      </Route>
      <Route path="/admin/users">
        <RoleGate roles={["admin"]}><AdminUsersPage /></RoleGate>
      </Route>
      <Route path="/parcels">
        <RoleGate roles={["resident", "admin", "security"]}><ParcelsPage /></RoleGate>
      </Route>
      <Route path="/classifieds">
        <RoleGate roles={["resident", "admin", "vendor"]}><ClassifiedsPage /></RoleGate>
      </Route>

      <Route>
        {user ? <Redirect to={`/dashboard/${user.role}`} /> : <Redirect to="/" />}
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
