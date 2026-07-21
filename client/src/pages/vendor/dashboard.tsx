import { useQuery, useQueries } from "@tanstack/react-query";
import { Link } from "wouter";
import { Store, Star, Phone, Plus, BadgeCheck, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { PageFooter } from "@/components/shared/page-footer";
import { RoleBanner } from "@/components/shared/role-banner";
import { SectionTitle } from "@/components/shared/section-title";
import { KpiTile } from "@/components/shared/kpi-tile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionLoader } from "@/components/shared/loading";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/utils";
import type { ServiceProvider, ServiceReview } from "@shared/types";

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

  // Reviews are per-listing server-side (no cross-listing endpoint), so
  // fetch each listing's reviews in parallel and merge for one "what's
  // recent" view — the thing a vendor actually checks daily, per the
  // dashboard refresh this was built for.
  const reviewQueries = useQueries({
    queries: myListings.map((p) => ({
      queryKey: ["services", p.id, "reviews"],
      queryFn: () => api.get<ServiceReview[]>(`/api/services/${p.id}/reviews`).then((r) => r.data),
      enabled: myListings.length > 0,
    })),
  });
  const loadingReviews = reviewQueries.some((q) => q.isLoading);
  const recentReviews = reviewQueries
    .flatMap((q, i) => (q.data ?? []).map((r) => ({ ...r, providerName: myListings[i]!.name })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="page-wrap" data-bottomnav="true">
      <TopBar title="Vendor" />

      <main className="container-app pt-5 pb-6 space-y-5 page-content">
        <RoleBanner role="vendor" />

        {/* Hero */}
        <div className="archetype-card">
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-brand-gold/20 border border-brand-gold/40 flex items-center justify-center shrink-0">
              <span className="font-display font-black text-xl text-brand-gold">
                {user?.name?.charAt(0) ?? "V"}
              </span>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gold mb-1">
                Service Provider
              </p>
              <h1 className="font-display font-extrabold text-xl leading-tight">
                {user?.name}
              </h1>
              <p className="font-medium text-sm text-white/70">JiraniHub Marketplace</p>
            </div>
          </div>
          <div className="mt-4 flag-bar w-24 relative z-10" />
        </div>

        {/* KPIs */}
        <section>
          <SectionTitle>Your numbers</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            <KpiTile label="Listings" value={String(myListings.length)} tone="green" />
            <KpiTile label="Avg. rating" value={avgRating} tone="gold" />
            <KpiTile label="Reviews" value={String(totalReviews)} tone="neutral" />
          </div>
        </section>

        {/* Listings */}
        <section>
          <SectionTitle
            action={
              <Link href="/marketplace">
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </Link>
            }
          >
            My listings
          </SectionTitle>

          {isLoading ? (
            <SectionLoader />
          ) : !myListings.length ? (
            <div className="tribal-card p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-brand-amber/10 flex items-center justify-center mx-auto mb-3">
                <Store className="h-7 w-7 text-brand-amber" />
              </div>
              <p className="font-display font-semibold text-tribal-charcoal mb-1">No listings yet</p>
              <p className="text-tribal-earth text-sm mb-4">
                Add your service to the marketplace
              </p>
              <Link href="/marketplace">
                <Button size="sm" variant="secondary">
                  Add your first service
                </Button>
              </Link>
            </div>
          ) : (
            <div className="card-grid">
              {myListings.map((p) => (
                <Card key={p.id}>
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-display font-bold text-sm text-tribal-charcoal">{p.name}</p>
                          {p.verified && <BadgeCheck className="h-4 w-4 text-brand-green" />}
                        </div>
                        <p className="text-xs text-tribal-earth">{p.category}</p>
                        {p.description && (
                          <p className="text-xs text-tribal-earth mt-1 opacity-80">{p.description}</p>
                        )}
                        {p.ratingCount > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3.5 w-3.5 text-brand-gold fill-brand-gold" />
                            <span className="text-xs text-tribal-earth">
                              {Number(p.rating ?? 0).toFixed(1)} ({p.ratingCount})
                            </span>
                          </div>
                        )}
                      </div>
                      <a
                        href={`tel:${p.phone}`}
                        className="flex items-center gap-1.5 text-sm font-bold text-brand-green bg-brand-green/10 rounded-xl px-2.5 py-1.5 shrink-0"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    </div>
                    {!p.verified && (
                      <div className="mt-2 text-xs text-brand-gold-dark bg-brand-gold/15 rounded-xl px-3 py-1.5 border border-brand-gold/30">
                        ⏳ Pending admin verification
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Recent reviews */}
        {myListings.length > 0 && (
          <section>
            <SectionTitle icon={<MessageSquare className="h-4 w-4" />}>Recent reviews</SectionTitle>
            {loadingReviews ? (
              <SectionLoader />
            ) : recentReviews.length === 0 ? (
              <div className="tribal-card p-6 text-center">
                <MessageSquare className="h-7 w-7 text-tribal-border mx-auto mb-2" />
                <p className="text-tribal-earth text-sm font-medium">No reviews yet.</p>
              </div>
            ) : (
              <div className="card-grid">
                {recentReviews.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-tribal-charcoal truncate">{r.providerName}</p>
                        <span className="flex items-center gap-1 text-[#D4A017] shrink-0">
                          <Star className="h-3.5 w-3.5 fill-[#D4A017]" />
                          <span className="text-xs font-bold">{r.rating}</span>
                        </span>
                      </div>
                      {r.comment && <p className="text-sm text-tribal-earth mt-1">{r.comment}</p>}
                      <p className="text-xs text-tribal-earth/60 mt-1">
                        {r.reviewer?.name ?? "Resident"} · {formatRelative(r.createdAt)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <PageFooter />

      <BottomNav />
    </div>
  );
}
