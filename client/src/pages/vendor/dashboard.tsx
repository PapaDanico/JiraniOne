import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Store, Star, Phone, Plus, BadgeCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionLoader } from "@/components/shared/loading";
import { api } from "@/lib/api";
import type { ServiceProvider } from "@shared/types";

export default function VendorDashboard() {
  const { user } = useAuth();

  const { data: allProviders, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => api.get<ServiceProvider[]>("/api/services").then((r) => r.data),
  });

  const myListings = allProviders?.filter((p) => p.userId === user?.id) ?? [];
  const avgRating = myListings.length
    ? (myListings.reduce((s, p) => s + Number(p.rating ?? 0), 0) / myListings.length).toFixed(1)
    : "—";

  return (
    <div className="min-h-screen bg-white pb-20">
      <TopBar title="Vendor" />

      <main className="max-w-lg mx-auto px-4 pt-4 pb-6 space-y-6">
        <div>
          <h1 className="font-['Plus_Jakarta_Sans'] font-bold text-2xl text-gray-900">My Services</h1>
          <p className="text-sm text-gray-500 mt-0.5">{user?.name}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Listings", value: String(myListings.length), icon: <Store className="h-5 w-5 text-[#1A5C38]" /> },
            { label: "Avg Rating", value: avgRating, icon: <Star className="h-5 w-5 text-[#D47A00]" /> },
            { label: "Reviews", value: String(myListings.reduce((s, p) => s + p.ratingCount, 0)), icon: <Star className="h-5 w-5 text-blue-500" /> },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="py-3 px-4 text-center">
                <div className="flex justify-center mb-1">{s.icon}</div>
                <div className="text-xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Listings */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">My Listings</h2>
            <Link href="/marketplace">
              <Button size="sm"><Plus className="h-4 w-4" /> Add listing</Button>
            </Link>
          </div>

          {isLoading ? (
            <SectionLoader />
          ) : !myListings.length ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Store className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-3">
                  You haven't added any service listings yet.
                </p>
                <Link href="/marketplace">
                  <Button size="sm" variant="secondary">Add your first listing</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {myListings.map((p) => (
                <Card key={p.id}>
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-gray-900">{p.name}</p>
                          {p.verified && <BadgeCheck className="h-4 w-4 text-[#1A5C38]" />}
                        </div>
                        <p className="text-xs text-gray-500">{p.category}</p>
                        {p.description && <p className="text-xs text-gray-400 mt-1">{p.description}</p>}
                        {p.ratingCount > 0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            ★ {Number(p.rating ?? 0).toFixed(1)} ({p.ratingCount} reviews)
                          </p>
                        )}
                      </div>
                      <a href={`tel:${p.phone}`} className="flex items-center gap-1 text-sm text-[#1A5C38] shrink-0">
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    </div>
                    {!p.verified && (
                      <p className="text-xs text-amber-600 mt-2 bg-amber-50 rounded px-2 py-1">
                        Pending admin verification
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
