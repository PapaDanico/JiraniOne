import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface EstateInfo {
  id: string;
  name: string;
  location: string;
  totalUnits: number | null;
  securityPhone: string | null;
}

export function useEstate() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["estate"],
    queryFn: () => api.get<EstateInfo | null>("/api/auth/estate").then((r) => r.data),
    enabled: !!user?.estateId,
    staleTime: 5 * 60 * 1000,
  });
}
