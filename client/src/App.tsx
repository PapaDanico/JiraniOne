import { lazy, Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { RoleGate } from "@/components/shared/role-gate";
import { PageLoader } from "@/components/shared/loading";

// ─── Code-split every page into its own chunk (P3 fix) ───────────────────────
// Each lazy() call creates a separate JS chunk — loaded only when that route
// is first visited, cutting initial bundle from ~611 KB to ~80-120 KB.

const LandingPage        = lazy(() => import("@/pages/landing"));
const LoginPage          = lazy(() => import("@/pages/login"));
const RegisterPage       = lazy(() => import("@/pages/register"));
const ForgotPasswordPage = lazy(() => import("@/pages/forgot-password"));
const ResidentDashboard  = lazy(() => import("@/pages/resident/dashboard"));
const AdminDashboard     = lazy(() => import("@/pages/admin/dashboard"));
const SecurityDashboard  = lazy(() => import("@/pages/security/dashboard"));
const VendorDashboard    = lazy(() => import("@/pages/vendor/dashboard"));
const VisitorsPage       = lazy(() => import("@/pages/visitor/index"));
const MaintenancePage    = lazy(() => import("@/pages/maintenance/index"));
const AnnouncementsPage  = lazy(() => import("@/pages/announcements/index"));
const PaymentsPage       = lazy(() => import("@/pages/payments/index"));
const EmergencyPage      = lazy(() => import("@/pages/emergency/index"));
const EventsPage         = lazy(() => import("@/pages/events/index"));
const GovernancePage     = lazy(() => import("@/pages/governance/index"));
const BookingsPage       = lazy(() => import("@/pages/bookings/index"));
const MarketplacePage    = lazy(() => import("@/pages/marketplace/index"));
const NotificationsPage  = lazy(() => import("@/pages/notifications/index"));
const AdminUsersPage     = lazy(() => import("@/pages/admin/users"));
const ParcelsPage        = lazy(() => import("@/pages/parcels/index"));
const ClassifiedsPage    = lazy(() => import("@/pages/classifieds/index"));
const HarambeePage       = lazy(() => import("@/pages/harambee/index"));
const CarpoolPage        = lazy(() => import("@/pages/carpool/index"));
const ChamaPage          = lazy(() => import("@/pages/chama/index"));

function AppRoutes() {
  const { user, isLoading } = useAuth();
  useWebSocket(!!user);

  if (isLoading) return <PageLoader />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />

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
        <Route path="/harambee">
          <RoleGate roles={["resident", "admin"]}><HarambeePage /></RoleGate>
        </Route>
        <Route path="/carpool">
          <RoleGate roles={["resident", "admin"]}><CarpoolPage /></RoleGate>
        </Route>
        <Route path="/chama">
          <RoleGate roles={["resident", "admin"]}><ChamaPage /></RoleGate>
        </Route>

        <Route>
          {user ? <Redirect to={`/dashboard/${user.role}`} /> : <Redirect to="/" />}
        </Route>
      </Switch>
    </Suspense>
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
