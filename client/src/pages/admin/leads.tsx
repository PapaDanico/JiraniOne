import { useQuery } from "@tanstack/react-query";
import { Building2, Phone, Mail, Users } from "lucide-react";
import { TopBar, BottomNav } from "@/components/shared/navigation";
import { PageFooter } from "@/components/shared/page-footer";
import { Card, CardContent } from "@/components/ui/card";
import { SectionLoader } from "@/components/shared/loading";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/utils";
import type { Lead } from "@shared/types";

export default function AdminLeadsPage() {
  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["leads"],
    queryFn: () => api.get<Lead[]>("/api/leads").then((r) => r.data),
  });

  return (
    <div className="page-wrap" data-bottomnav="true">
      <TopBar title="Estate Inquiries" />

      <main className="container-app pt-5 pb-6 space-y-4 page-content">
        <p className="text-sm text-tribal-earth">
          Prospects who requested a walkthrough from the landing page — the
          B2B pipeline for new estates joining JiraniHub.
        </p>

        {isLoading ? (
          <SectionLoader />
        ) : leads.length === 0 ? (
          <div className="tribal-card p-8 text-center">
            <Building2 className="h-7 w-7 text-tribal-border mx-auto mb-2" />
            <p className="text-tribal-earth text-sm font-medium">No inquiries yet.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {leads.map((l) => (
              <Card key={l.id}>
                <CardContent className="py-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display font-bold text-sm text-tribal-charcoal truncate">
                        {l.estateName}
                      </p>
                      <p className="text-xs text-tribal-earth">
                        {l.contactName} · {formatRelative(l.createdAt)}
                      </p>
                    </div>
                    {l.unitsCount != null && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-tribal-earth shrink-0">
                        <Users className="h-3.5 w-3.5" /> {l.unitsCount} units
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <a href={`tel:${l.phone}`} className="flex items-center gap-1 text-brand-green font-semibold">
                      <Phone className="h-3.5 w-3.5" /> {l.phone}
                    </a>
                    {l.email && (
                      <a href={`mailto:${l.email}`} className="flex items-center gap-1 text-brand-green font-semibold">
                        <Mail className="h-3.5 w-3.5" /> {l.email}
                      </a>
                    )}
                  </div>
                  {l.message && (
                    <p className="text-sm text-tribal-earth mt-1 opacity-80">{l.message}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <PageFooter />

      <BottomNav />
    </div>
  );
}
