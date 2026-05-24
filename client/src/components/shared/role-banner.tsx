import { ROLE_PRESENTATION } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { UserRole } from "@shared/types";

interface Props {
  role: UserRole;
}

// Plain-English "what view is this?" callout that sits at the top of
// every role-specific dashboard. Solves the tester-confusion problem
// where neighbours land on /dashboard/resident and don't realise the
// admin side exists as a separate view.
export function RoleBanner({ role }: Props) {
  const r = ROLE_PRESENTATION[role];
  const Icon = r.Icon;
  return (
    <div
      data-testid={`role-banner-${role}`}
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-4 py-3",
        r.banner.container,
      )}
    >
      <div
        className={cn(
          "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center",
          r.banner.iconBg,
        )}
      >
        <Icon className={cn("h-5 w-5", r.banner.iconFg)} />
      </div>
      <div className="min-w-0">
        <p className={cn("text-[11px] font-bold uppercase tracking-[0.14em]", r.banner.text)}>
          {r.label} view
        </p>
        <p className="text-[12px] text-tribal-earth leading-snug mt-0.5">
          {r.description}
        </p>
      </div>
    </div>
  );
}
