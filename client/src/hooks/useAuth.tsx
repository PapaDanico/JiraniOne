import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuthUser } from "@shared/types";

interface AuthContext {
  user: AuthUser | null;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: {
    phone: string; password: string; name: string;
    estateId?: string; unitNumber?: string; consent: boolean;
  }) => Promise<void>;
}

const Ctx = createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api.get<AuthUser>("/api/auth/me").then((r) => r.data),
    retry: false,
    staleTime: Infinity,
  });

  const loginMutation = useMutation({
    mutationFn: ({ phone, password }: { phone: string; password: string }) =>
      api.post<AuthUser>("/api/auth/login", { phone, password }),
    onSuccess: (res) => {
      qc.setQueryData(["auth", "me"], res.data);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.post("/api/auth/logout"),
    onSuccess: () => {
      qc.setQueryData(["auth", "me"], null);
      qc.clear();
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: { phone: string; password: string; name: string; estateId?: string; unitNumber?: string; consent: boolean }) =>
      api.post<AuthUser>("/api/auth/register", data),
    onSuccess: (res) => {
      qc.setQueryData(["auth", "me"], res.data);
    },
  });

  return (
    <Ctx.Provider
      value={{
        user: data ?? null,
        isLoading,
        login: (phone, password) =>
          loginMutation.mutateAsync({ phone, password }).then(() => {}),
        logout: () => logoutMutation.mutateAsync().then(() => {}),
        register: (data) => registerMutation.mutateAsync(data).then(() => {}),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
