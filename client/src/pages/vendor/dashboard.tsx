import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Store, Star, Phone, Plus, BadgeCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { RoleBanner } from "@/components/shared/role-banner";
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
  const totalReviews = myListings.reduce((s, p) => s + p.ratingCount, 0);
  const avgRating = myListings.length
    ? (myListings.reduce((s, p) => s + Number(p.rating ?? 0), 0) / myListings.length).toFixed(1)
    : "—";

  return (
    <div className="page-wrap">
      <TopBar title="Vendor" />

      <main className="max-w-lg mx-auto px-4 pt-4 pb-6 space-y-5 page-content">
        {/* Role banner */}
        <RoleBanner role="vendor" />

        {/* Hero card */}
        <div className="kitenge-hero rounded-2xl p-5 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-[#D4A017]/25 flex items-center justify-center">
              <span className="font-black text-xl text-[#D4A017]">{user?.name?.charAt(0) ?? "V"}</span>
            </div>
            <div>
              <p className="font-bold text-lg leading-tight">{user?.name}</p>
              <p className="text-white/70 text-sm">Vendor · JiraniHub</p>
            </div>
          </div>
          <div className="maasai-stripe rounded-full" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Listings", value: String(myListings.length), emoji: "🏪" },
            { label: "Avg. Rating", value: avgRating, emoji: "⭐" },
            { label: "Reviews", value: String(totalReviews), emoji: "💬" },
          ].map((s) => (
            <div key={s.label} className="tribal-card p-3 text-center">
              <div className="text-2xl mb-1">{s.emoji}</div>
              <div className="text-xl font-black text-[#212121]">{s.value}</div>
              <div className="text-xs text-[#6B5D45] font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Listings */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">My Listings</p>
            <Link href="/marketplace">
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <SectionLoader />
          ) : !myListings.length ? (
            <div className="tribal-card p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#D47A00]/10 flex items-center justify-center mx-auto mb-3">
                <Store className="h-7 w-7 text-[#D47A00]" />
              </div>
              <p className="font-semibold text-[#212121] mb-1">No listings yet</p>
              <p className="text-[#6B5D45] text-sm mb-4">Add your service to the marketplace</p>
              <Link href="/marketplace">
                <Button size="sm" variant="secondary">Add your first service</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {myListings.map((p) => (
                <Card key={p.id}>
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-[#212121]">{p.name}</p>
                          {p.verified && <BadgeCheck className="h-4 w-4 text-[#1B5E20]" />}
                        </div>
                        <p className="text-xs text-[#6B5D45]">{p.category}</p>
                        {p.description && (
                          <p className="text-xs text-[#6B5D45] mt-1 opacity-80">{p.description}</p>
                        )}
                        {p.ratingCount > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3.5 w-3.5 text-[#D4A017] fill-[#D4A017]" />
                            <span className="text-xs text-[#6B5D45]">
                              {Number(p.rating ?? 0).toFixed(1)} ({p.ratingCount})
                            </span>
                          </div>
                        )}
                      </div>
                      <a
                        href={`tel:${p.phone}`}
                        className="flex items-center gap-1.5 text-sm font-bold text-[#1B5E20] bg-[#1B5E20]/8 rounded-xl px-2.5 py-1.5 shrink-0"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    </div>
                    {!p.verified && (
                      <div className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-1.5 border border-amber-200">
                        ⏳ Pending admin verification
                      </div>
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
