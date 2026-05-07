import type { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { PageLoader } from "./loading";
import type { UserRole } from "@shared/types";

interface Props {
  children: ReactNode;
  roles?: UserRole[];
}

export function RoleGate({ children, roles }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;
  if (!user) return <Redirect to="/login" />;
  if (roles && !roles.includes(user.role)) return <Redirect to={`/dashboard/${user.role}`} />;

  return <>{children}</>;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (user) return <Redirect to={`/dashboard/${user.role}`} />;
  return <>{children}</>;
}
