import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, LogIn, LogOut, Clock, CheckCircle } from "lucide-react";
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
    queryFn: () => api.get<Visitor[]>("/api/visitors/gate-log").then((r) => r.data),
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
    (v) => !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.phone.includes(search),
  );

  const insideCount = visitors?.filter((v) => v.status === "checked_in").length ?? 0;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      {insideCount > 0 && (
        <div className="bg-[#1B5E20]/8 border border-[#1B5E20]/20 rounded-2xl px-4 py-3 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-[#1B5E20]" />
          <span className="text-sm font-semibold text-[#1B5E20]">
            {insideCount} mgeni {insideCount === 1 ? "yuko" : "wako"} ndani sasa hivi
          </span>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B5D45]" />
        <Input
          placeholder="Tafuta jina au simu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <SectionLoader />
      ) : filtered?.length === 0 ? (
        <div className="tribal-card p-10 text-center">
          <p className="text-[#6B5D45] text-sm">Hakuna wageni wanaopatikana.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered?.map((v) => (
            <Card
              key={v.id}
              className={
                v.status === "checked_in"
                  ? "border-[#1B5E20]/30 bg-[#1B5E20]/5"
                  : v.status === "pending"
                  ? "border-amber-300/40 bg-amber-50/30"
                  : ""
              }
            >
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-[#212121]">{v.name}</span>
                      <Badge
                        variant={
                          v.status === "checked_in"
                            ? "default"
                            : v.status === "checked_out"
                            ? "secondary"
                            : "warning"
                        }
                      >
                        {v.status === "checked_in" ? "Ndani" : v.status === "checked_out" ? "Ametoka" : "Anasubiriwa"}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#6B5D45]">{v.phone}</p>
                    {v.purpose && <p className="text-xs text-[#6B5D45] italic mt-0.5">"{v.purpose}"</p>}
                    {v.checkedInAt && (
                      <p className="text-xs text-[#1B5E20] mt-0.5 flex items-center gap-1">
                        <LogIn className="h-3 w-3" /> Aliingia: {formatDateTime(v.checkedInAt)}
                      </p>
                    )}
                    {v.checkedOutAt && (
                      <p className="text-xs text-[#6B5D45] flex items-center gap-1">
                        <LogOut className="h-3 w-3" /> Alitoka: {formatDateTime(v.checkedOutAt)}
                      </p>
                    )}
                    {!v.checkedInAt && v.expectedAt && (
                      <p className="text-xs text-amber-700 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Anatarajiwa: {formatDateTime(v.expectedAt)}
                      </p>
                    )}
                    <p className="text-xs text-[#D4C9A8] mt-1">{formatRelative(v.createdAt)}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {v.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() => checkInMutation.mutate(v.id)}
                        loading={checkInMutation.isPending}
                        className="text-xs min-h-[36px] gap-1"
                      >
                        <LogIn className="h-3 w-3" /> Ingia
                      </Button>
                    )}
                    {v.status === "checked_in" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => checkOutMutation.mutate(v.id)}
                        loading={checkOutMutation.isPending}
                        className="text-xs min-h-[36px] gap-1"
                      >
                        <LogOut className="h-3 w-3" /> Toka
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
