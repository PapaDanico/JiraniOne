import type { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { PageLoader } from "./loading";
import type { UserRole } from "@shared/types";

interface Props {
  children: ReactNode;
  roles?: UserRole[];
}

// Shown when we could not establish who the user is for a reason that
// isn't "signed out" — a rate-limited or failed /api/auth/me. Redirecting
// to /login here would be a lie: the session cookie is still valid, and
// the user would be typing their password to fix a network blip.
function AuthUnavailable() {
  const { retryAuth, isRetryingAuth } = useAuth();
  return (
    <div className="page-wrap">
      <main className="container-list pt-16 text-center">
        <p className="text-tribal-earth font-medium mb-1">Can&apos;t reach JiraniOne</p>
        <p className="text-sm text-tribal-earth/80 mb-5">
          Your session is still active — the network or server didn&apos;t respond.
          Hakuna shida, jaribu tena.
        </p>
        <button
          type="button"
          onClick={retryAuth}
          disabled={isRetryingAuth}
          className="btn-primary"
        >
          {isRetryingAuth ? "Retrying…" : "Try again"}
        </button>
      </main>
    </div>
  );
}

export function RoleGate({ children, roles }: Props) {
  const { user, isLoading, authError } = useAuth();

  if (isLoading) return <PageLoader />;
  if (authError && !user) return <AuthUnavailable />;
  if (!user) return <Redirect to="/login" />;
  if (roles && !roles.includes(user.role)) return <Redirect to={`/dashboard/${user.role}`} />;

  return <>{children}</>;
}

export function AuthGate({ children }: { children: ReactNode }) {
  // No authError branch: this guards the public pages (login, register).
  // If the identity check failed, showing the login form is the right
  // fallback — the user can still sign in.
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (user) return <Redirect to={`/dashboard/${user.role}`} />;
  return <>{children}</>;
}
