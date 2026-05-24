import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

// Inspired by the KASH `.stitle`: bottom-border on the gold accent, green
// text, optional icon on the left, optional action (link/button) on the
// right. Use for every major section title.
export function SectionTitle({ children, icon, action, className }: Props) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 pb-2 mb-3",
        "border-b-2 border-brand-gold/40",
        className,
      )}
    >
      <h2 className="text-base font-semibold text-brand-green flex items-center gap-2 font-display tracking-tight">
        {icon}
        {children}
      </h2>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
