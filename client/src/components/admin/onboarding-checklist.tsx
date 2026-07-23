import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useEstate } from "@/hooks/useEstate";
import type { EstateAnalytics, Facility, Announcement, ServiceProvider, EstateDocument } from "@shared/types";
import { BRAND_NAME } from "@shared/brand";

interface EstateUser { id: string }

// Ordered by real-world urgency for a brand-new estate: the security desk
// phone first (it's what the SOS page dials — a placeholder number there
// is a safety gap, not a cosmetic one), then people, then content.
const STEPS = [
  { key: "security",     label: "Set your security desk phone", desc: "Residents one-tap call this number from the SOS page.",   href: "/admin/settings" },
  { key: "resident",     label: "Invite your residents",    desc: `Share ${BRAND_NAME} with the households in your estate.`,     href: "/admin/users" },
  { key: "announcement", label: "Post an announcement",     desc: "Welcome residents and share the first estate notice.",    href: "/announcements" },
  { key: "facility",     label: "Add a facility",          desc: "Clubhouse, pool, parking — anything residents can book.", href: "/bookings" },
  { key: "provider",     label: "Add a service provider",   desc: "A plumber, electrician, or cleaner residents can call.",  href: "/marketplace" },
  { key: "document",     label: "Upload an estate document",desc: "Estate rules or AGM minutes residents can reference.",    href: "/documents" },
] as const;

// Shown on a fresh estate's admin dashboard until the basics are in place
// — otherwise a brand-new pilot's first login is a wall of zeros with no
// guidance on what to do first. Hides itself once every step is done, so
// it doesn't become permanent clutter for an estate that's up and running.
export function OnboardingChecklist() {
  const { data: analytics } = useQuery<EstateAnalytics>({
    queryKey: ["analytics"],
    queryFn: () => api.get<EstateAnalytics>("/api/analytics").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
  const { data: facilities } = useQuery<Facility[]>({
    queryKey: ["facilities"],
    queryFn: () => api.get<Facility[]>("/api/facilities").then((r) => r.data),
  });
  const { data: announcements } = useQuery<Announcement[]>({
    queryKey: ["announcements"],
    queryFn: () => api.get<Announcement[]>("/api/announcements").then((r) => r.data),
  });
  const { data: services } = useQuery<ServiceProvider[]>({
    queryKey: ["services"],
    queryFn: () => api.get<ServiceProvider[]>("/api/services").then((r) => r.data),
  });
  const { data: documents } = useQuery<EstateDocument[]>({
    queryKey: ["documents"],
    queryFn: () => api.get<EstateDocument[]>("/api/documents").then((r) => r.data),
  });
  const { data: residents } = useQuery<EstateUser[]>({
    queryKey: ["estate-users"],
    queryFn: () => api.get<EstateUser[]>("/api/users").then((r) => r.data),
  });

  const { data: estate } = useEstate();

  // Undefined (still loading) counts as "not done yet" so the checklist
  // doesn't flash all-complete before data arrives.
  const done: Record<(typeof STEPS)[number]["key"], boolean> = {
    security: !!estate?.securityPhone,
    facility: (facilities?.length ?? 0) > 0,
    announcement: (announcements?.length ?? 0) > 0,
    provider: (services?.length ?? 0) > 0,
    resident: (residents?.length ?? 0) > 1, // more than just the admin
    document: (documents?.length ?? 0) > 0,
  };

  const completedCount = Object.values(done).filter(Boolean).length;
  if (!analytics) return null; // still loading — avoid a flash of the full checklist
  if (completedCount === STEPS.length) return null; // fully set up — stop showing this

  return (
    <div className="tribal-card p-4 space-y-3 border-l-4 border-l-brand-gold">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand-gold-dark" />
        <p className="font-display font-bold text-sm text-tribal-charcoal">
          Getting Started ({completedCount}/{STEPS.length})
        </p>
      </div>
      <div className="space-y-2">
        {STEPS.map((step) => (
          <Link key={step.key} href={step.href}>
            <div className={`flex items-start gap-2.5 p-2 rounded-xl transition-colors ${done[step.key] ? "opacity-60" : "hover:bg-tribal-cream-dark"}`}>
              {done[step.key] ? (
                <CheckCircle2 className="h-4 w-4 text-brand-green shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-4 w-4 text-tribal-muted shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <p className={`text-xs font-semibold ${done[step.key] ? "text-tribal-earth line-through" : "text-tribal-charcoal"}`}>
                  {step.label}
                </p>
                {!done[step.key] && (
                  <p className="text-[11px] text-tribal-earth mt-0.5">{step.desc}</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
