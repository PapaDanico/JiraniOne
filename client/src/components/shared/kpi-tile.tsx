import { Link } from "wouter";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: number | string;
  delta?: string;
  icon?: ReactNode;
  tone?: "green" | "gold" | "red" | "neutral";
  href?: string;
}

// Compact KPI tile (KASH `.fte-c`). Big bold number on top, all-caps
// label below. Optional bottom delta line for trend hints.
const TONE_STYLES: Record<
  NonNullable<Props["tone"]>,
  { value: string; iconBg: string; iconFg: string }
> = {
  green: { value: "text-brand-green",     iconBg: "bg-brand-green/10",     iconFg: "text-brand-green" },
  gold:  { value: "text-brand-gold-dark", iconBg: "bg-brand-gold/15",      iconFg: "text-brand-gold-dark" },
  red:   { value: "text-brand-red",       iconBg: "bg-brand-red/10",       iconFg: "text-brand-red" },
  neutral:{ value: "text-tribal-charcoal",iconBg: "bg-tribal-cream-dark",  iconFg: "text-tribal-earth" },
};

export function KpiTile({ label, value, delta, icon, tone = "green", href }: Props) {
  const t = TONE_STYLES[tone];
  const inner = (
    <div className="kpi-tile flex flex-col items-center text-center">
      {icon && (
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", t.iconBg)}>
          <span className={t.iconFg}>{icon}</span>
        </div>
      )}
      <span className={cn("kpi-value", t.value)}>{value}</span>
      <span className="kpi-label">{label}</span>
      {delta && <span className="kpi-delta text-tribal-earth">{delta}</span>}
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block transition-shadow hover:shadow-card-lg">
        {inner}
      </Link>
    );
  }
  return inner;
}
