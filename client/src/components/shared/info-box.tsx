import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  variant?: "default" | "green" | "gold" | "red";
  className?: string;
}

// Info box with optional title bar + icon (KASH `.ibox`). Use for
// explanatory text, policy notes, "what is this?" callouts.
const VARIANT_BORDER: Record<NonNullable<Props["variant"]>, string> = {
  default: "",
  green: "border-l-4 border-l-brand-green",
  gold: "border-l-4 border-l-brand-gold",
  red: "border-l-4 border-l-brand-red",
};

export function InfoBox({
  title,
  icon,
  children,
  variant = "default",
  className,
}: Props) {
  return (
    <div className={cn("ibox", VARIANT_BORDER[variant], className)}>
      {title && (
        <div className="ibox-title">
          {icon}
          <span>{title}</span>
        </div>
      )}
      <div className="ibox-body">{children}</div>
    </div>
  );
}
