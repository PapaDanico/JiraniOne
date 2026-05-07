import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, LogIn, LogOut, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SectionLoader } from "@/components/shared/loading";
import { formatDateTime, formatRelative } from "@/lib/utils";
import type { Visitor } from "@shared/types";

export function GateLog() {
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data: visitors, isLoading } = useQuery({
    queryKey: ["visitors", "gate-log"],
    queryFn: () =>
      api.get<Visitor[]>("/api/visitors/gate-log").then((r) => r.data),
    refetchInterval: 15_000,
  });

  const checkInMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/visitors/${id}/check-in`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["visitors"] }),
  });

  const checkOutMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/visitors/${id}/check-out`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["visitors"] }),
  });

  const filtered = visitors?.filter(
    (v) =>
      !search ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.phone.includes(search),
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <SectionLoader />
      ) : filtered?.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-10">No visitors found.</p>
      ) : (
        <div className="space-y-2">
          {filtered?.map((v) => (
            <Card key={v.id}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-gray-900">{v.name}</span>
                      <Badge
                        variant={
                          v.status === "checked_in"
                            ? "default"
                            : v.status === "checked_out"
                              ? "secondary"
                              : "warning"
                        }
                      >
                        {v.status === "checked_in"
                          ? "Inside"
                          : v.status === "checked_out"
                            ? "Left"
                            : v.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">{v.phone}</p>
                    {v.checkedInAt && (
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <LogIn className="h-3 w-3" /> In: {formatDateTime(v.checkedInAt)}
                      </p>
                    )}
                    {v.checkedOutAt && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <LogOut className="h-3 w-3" /> Out: {formatDateTime(v.checkedOutAt)}
                      </p>
                    )}
                    {!v.checkedInAt && v.expectedAt && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Expected: {formatDateTime(v.expectedAt)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {v.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() => checkInMutation.mutate(v.id)}
                        loading={checkInMutation.isPending}
                        className="text-xs min-h-[36px]"
                      >
                        <LogIn className="h-3 w-3" /> Check In
                      </Button>
                    )}
                    {v.status === "checked_in" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => checkOutMutation.mutate(v.id)}
                        loading={checkOutMutation.isPending}
                        className="text-xs min-h-[36px]"
                      >
                        <LogOut className="h-3 w-3" /> Check Out
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
