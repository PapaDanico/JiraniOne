import {
  createContext,
  useContext,
  useRef,
  type ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuthUser } from "@shared/types";

interface AuthContext {
  user: AuthUser | null;
  isLoading: boolean;
  /** Set when the identity check failed for a reason other than 401. */
  authError: Error | null;
  /** Retry the identity check after an authError. */
  retryAuth: () => void;
  isRetryingAuth: boolean;
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

  // Only a 401 means "not signed in". Anything else — a 429 from the IP
  // rate limiter (estates share one NAT/CGNAT address on mobile data, so
  // one busy household can spend the budget for the whole gate), a 5xx, a
  // dropped 3G request — means "we don't know yet", and must NOT be
  // reported as a null user: RoleGate reads `user === null` as logged-out
  // and redirects to /login, so a transient blip silently signs people
  // out mid-session with a perfectly valid session cookie still set.
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api.get<AuthUser>("/api/auth/me").then((r) => r.data),
    retry: (failureCount, err: unknown) =>
      (err as { status?: number })?.status === 401 ? false : failureCount < 3,
    staleTime: Infinity,
  });

  // A 401 is a definitive answer (signed out), not an unresolved one.
  const authError =
    error && (error as { status?: number })?.status !== 401
      ? (error as Error)
      : null;

  // Guards against two classes of race on a shared/slow device: (1) the
  // initial /api/auth/me check is slow (3G) and resolves AFTER a login,
  // silently repainting the cache with the pre-login (or a previous user's,
  // on a shared device) identity; (2) a double-tap or fast logout-then-login
  // lets both mutations run concurrently, and whichever's onSuccess fires
  // last wins regardless of which action the user actually intended last.
  // cancelQueries() makes React Query discard the /auth/me query's result
  // if it resolves after being superseded; the generation counter does the
  // same for one auth mutation's result arriving after a newer one already
  // completed.
  const authGeneration = useRef(0);
  async function beginAuthAction() {
    const gen = ++authGeneration.current;
    await qc.cancelQueries({ queryKey: ["auth", "me"] });
    return { gen };
  }

  const loginMutation = useMutation({
    mutationFn: ({ phone, password }: { phone: string; password: string }) =>
      api.post<AuthUser>("/api/auth/login", { phone, password }),
    onMutate: beginAuthAction,
    onSuccess: (res, _vars, ctx) => {
      if (ctx.gen !== authGeneration.current) return;
      qc.setQueryData(["auth", "me"], res.data);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.post("/api/auth/logout"),
    onMutate: beginAuthAction,
    onSuccess: (_data, _vars, ctx) => {
      if (ctx.gen !== authGeneration.current) return;
      // clear() must run first — it wipes the entire cache, including
      // whatever we set on ["auth", "me"]. Setting it to null afterwards
      // (not before) is what actually makes `user` resolve to null
      // immediately, instead of leaving the query cache-less and racing
      // a refetch of /api/auth/me against RoleGate's redirect.
      qc.clear();
      qc.setQueryData(["auth", "me"], null);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: { phone: string; password: string; name: string; estateId?: string; unitNumber?: string; consent: boolean }) =>
      api.post<AuthUser>("/api/auth/register", data),
    onMutate: beginAuthAction,
    onSuccess: (res, _vars, ctx) => {
      if (ctx.gen !== authGeneration.current) return;
      qc.setQueryData(["auth", "me"], res.data);
    },
  });

  return (
    <Ctx.Provider
      value={{
        user: data ?? null,
        isLoading,
        authError,
        retryAuth: () => { void refetch(); },
        isRetryingAuth: isFetching,
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
