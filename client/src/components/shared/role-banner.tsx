import { ROLE_PRESENTATION } from "@/lib/roles";
import type { UserRole } from "@shared/types";
import { cn } from "@/lib/utils";

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
        r.bannerBg,
        r.bannerBorder,
      )}
    >
      <div
        className={cn(
          "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center",
          r.bannerIconBg,
        )}
      >
        <Icon className={cn("h-5 w-5", r.bannerIconFg)} />
      </div>
      <div className="min-w-0">
        <p className={cn("text-xs font-bold uppercase tracking-wider", r.bannerText)}>
          {r.label} view
        </p>
        <p className="text-[12px] text-[#6B5D45] leading-snug mt-0.5">
          {r.description}
        </p>
      </div>
    </div>
  );
}
