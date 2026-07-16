import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QrCode, Search, CheckCircle, XCircle, Phone, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import type { Visitor } from "@shared/types";

export function QrScanner() {
  const qc = useQueryClient();
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<Visitor[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lookupMutation = useMutation({
    mutationFn: (params: { qr?: string; phone?: string }) => {
      const qs = params.qr
        ? `?qr=${encodeURIComponent(params.qr)}`
        : `?phone=${encodeURIComponent(params.phone!)}`;
      return api.get<Visitor[]>(`/api/visitors/lookup${qs}`);
    },
    onSuccess: (res) => { setResult(res.data); setError(null); },
    onError: (e: unknown) => { setError(e instanceof Error ? e.message : "Search failed"); setResult(null); },
  });

  const checkInMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/visitors/${id}/check-in`),
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ["visitors"] });
      if (phone.trim()) lookupMutation.mutate({ phone: phone.trim() });
    },
    onError: (e: unknown) => {
      setError(e instanceof Error ? e.message : "Check-in failed. Please try again.");
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/visitors/${id}/check-out`),
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ["visitors"] });
      if (phone.trim()) lookupMutation.mutate({ phone: phone.trim() });
    },
    onError: (e: unknown) => {
      setError(e instanceof Error ? e.message : "Check-out failed. Please try again.");
    },
  });

  const handleSearch = () => {
    if (phone.trim()) lookupMutation.mutate({ phone: phone.trim() });
  };

  return (
    <div className="space-y-4">
      {/* Phone search */}
      <div>
        <p className="section-label mb-2">Search by Phone Number</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B5D45]" />
            <Input
              type="tel"
              inputMode="tel"
              placeholder="0722 123 456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button
            onClick={handleSearch}
            loading={lookupMutation.isPending}
            className="shrink-0 gap-1.5"
          >
            <Search className="h-4 w-4" /> Search
          </Button>
        </div>
      </div>

      {/* QR note */}
      <div className="bg-[#EDE7D8] border border-[#D4C9A8] rounded-2xl p-4 flex gap-3 items-start">
        <QrCode className="h-5 w-5 text-[#6B5D45] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-[#212121]">QR Code Scanning</p>
          <p className="text-xs text-[#6B5D45] mt-0.5">
            Camera scanning requires the JiraniHub mobile app. For now, use phone number search.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[#B71C1C]/10 border border-[#B71C1C]/20 rounded-xl px-4 py-3 text-sm text-[#B71C1C]">
          {error}
        </div>
      )}

      {/* No results */}
      {result && result.length === 0 && (
        <div className="tribal-card p-8 text-center">
          <p className="text-[#6B5D45] text-sm">No visitor found with that phone number.</p>
        </div>
      )}

      {/* Results */}
      {result && result.length > 0 && (
        <div className="space-y-2">
          {result.map((v) => (
            <Card
              key={v.id}
              className={
                v.status === "checked_in"
                  ? "border-[#1B5E20]/30 bg-[#1B5E20]/5"
                  : v.status === "pending"
                  ? "border-amber-300/40"
                  : "opacity-60"
              }
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-8 h-8 rounded-full bg-[#1B5E20] flex items-center justify-center shrink-0">
                        <span className="text-white font-bold text-sm">{v.name.charAt(0)}</span>
                      </div>
                      <div>
                        <span className="font-bold text-[#212121]">{v.name}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge
                            variant={
                              v.status === "checked_in" ? "default"
                              : v.status === "pending" ? "warning"
                              : "secondary"
                            }
                          >
                            {v.status === "checked_in" ? "Inside"
                             : v.status === "pending" ? "Expected"
                             : v.status === "checked_out" ? "Left"
                             : v.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-[#6B5D45] pl-10">{v.phone}</p>
                    {v.purpose && <p className="text-xs text-[#6B5D45] italic pl-10">"{v.purpose}"</p>}
                    {v.expectedAt && v.status === "pending" && (
                      <p className="text-xs text-amber-700 pl-10 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" /> Expected: {formatDateTime(v.expectedAt)}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {v.status === "pending" && (
                      <Button
                        onClick={() => checkInMutation.mutate(v.id)}
                        loading={checkInMutation.isPending}
                        className="gap-1.5"
                      >
                        <CheckCircle className="h-4 w-4" /> Allow Entry
                      </Button>
                    )}
                    {v.status === "checked_in" && (
                      <Button
                        variant="secondary"
                        onClick={() => checkOutMutation.mutate(v.id)}
                        loading={checkOutMutation.isPending}
                        className="gap-1.5"
                      >
                        <XCircle className="h-4 w-4" /> Check Out
                      </Button>
                    )}
                    {(v.status === "cancelled" || v.status === "expired") && (
                      <Badge variant="destructive">Invalid</Badge>
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
