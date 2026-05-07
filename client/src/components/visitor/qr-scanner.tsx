import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QrCode, Search, CheckCircle, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Visitor } from "@shared/types";

export function QrScanner() {
  const qc = useQueryClient();
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<Visitor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<"phone" | "qr">("phone");

  const lookupMutation = useMutation({
    mutationFn: (params: { qr?: string; phone?: string }) => {
      const qs = params.qr
        ? `?qr=${encodeURIComponent(params.qr)}`
        : `?phone=${encodeURIComponent(params.phone!)}`;
      return api.get<Visitor[]>(`/api/visitors/lookup${qs}`);
    },
    onSuccess: (res) => {
      setResult(res.data);
      setError(null);
    },
    onError: (e: unknown) => {
      setError(e instanceof Error ? e.message : "Lookup failed");
      setResult(null);
    },
  });

  const checkInMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/visitors/${id}/check-in`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visitors"] });
      lookupMutation.mutate({ phone });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/visitors/${id}/check-out`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visitors"] });
      lookupMutation.mutate({ phone });
    },
  });

  const handlePhoneLookup = () => {
    if (phone.trim()) lookupMutation.mutate({ phone: phone.trim() });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={scanMode === "phone" ? "default" : "secondary"}
          size="sm"
          onClick={() => setScanMode("phone")}
        >
          <Search className="h-4 w-4" /> Phone
        </Button>
        <Button
          variant={scanMode === "qr" ? "default" : "secondary"}
          size="sm"
          onClick={() => setScanMode("qr")}
        >
          <QrCode className="h-4 w-4" /> QR Code
        </Button>
      </div>

      {scanMode === "phone" ? (
        <div className="flex gap-2">
          <Input
            type="tel"
            inputMode="tel"
            placeholder="0722 123 456"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePhoneLookup()}
          />
          <Button
            onClick={handlePhoneLookup}
            loading={lookupMutation.isPending}
            className="shrink-0"
          >
            Search
          </Button>
        </div>
      ) : (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
          <QrCode className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            QR camera scanning requires the JiraniHub mobile app.
          </p>
          <p className="text-xs text-gray-300 mt-1">
            Use phone lookup for now.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && result.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">No visitors found.</p>
      )}

      {result && result.length > 0 && (
        <div className="space-y-2">
          {result.map((v) => (
            <Card key={v.id} className="border-2 border-[#1A5C38]/20">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{v.name}</span>
                      <Badge
                        variant={
                          v.status === "checked_in"
                            ? "default"
                            : v.status === "pending"
                              ? "warning"
                              : "secondary"
                        }
                      >
                        {v.status === "checked_in"
                          ? "Inside"
                          : v.status === "pending"
                            ? "Expected"
                            : v.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">{v.phone}</p>
                    {v.purpose && <p className="text-xs text-gray-400">{v.purpose}</p>}
                  </div>
                  <div>
                    {v.status === "pending" && (
                      <Button
                        onClick={() => checkInMutation.mutate(v.id)}
                        loading={checkInMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4" /> Check In
                      </Button>
                    )}
                    {v.status === "checked_in" && (
                      <Button
                        variant="secondary"
                        onClick={() => checkOutMutation.mutate(v.id)}
                        loading={checkOutMutation.isPending}
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
