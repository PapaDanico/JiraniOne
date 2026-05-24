import { ROLE_PRESENTATION } from "@/lib/roles";
import type { UserRole } from "@shared/types";
import { cn } from "@/lib/utils";

interface Props {
  role: UserRole;
  size?: "sm" | "md";
  // When true, prefixes with "Signed in as" / "Logged in as" so the
  // chip reads as a status rather than a tag. We use this on the TopBar.
  withPrefix?: boolean;
  className?: string;
}

export function RoleBadge({ role, size = "md", withPrefix = false, className }: Props) {
  const r = ROLE_PRESENTATION[role];
  const Icon = r.Icon;
  return (
    <span
      data-testid={`role-badge-${role}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-bold uppercase tracking-wider",
        size === "sm"
          ? "px-2 py-0.5 text-[10px]"
          : "px-2.5 py-1 text-[11px]",
        r.chipBg,
        r.chipFg,
        r.chipBorder,
        className,
      )}
    >
      <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
      {withPrefix && (
        <span className="font-semibold normal-case tracking-normal opacity-80">
          Signed in as
        </span>
      )}
      <span>{r.label}</span>
    </span>
  );
}
