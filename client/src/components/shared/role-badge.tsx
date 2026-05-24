import { ROLE_PRESENTATION } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { UserRole } from "@shared/types";

interface Props {
  role: UserRole;
  size?: "sm" | "md";
  className?: string;
}

export function RoleBadge({ role, size = "md", className }: Props) {
  const r = ROLE_PRESENTATION[role];
  const Icon = r.Icon;
  return (
    <span
      data-testid={`role-badge-${role}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wide",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
        r.chip,
        className,
      )}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      <span className="uppercase tracking-wider">{r.label}</span>
    </span>
  );
}
