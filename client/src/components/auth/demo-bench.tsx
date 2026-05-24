import { ChevronRight, FlaskConical } from "lucide-react";
import { ROLE_PRESENTATION } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { UserRole } from "@shared/types";

// Four hard-coded demo phones that mirror server/src/seed.ts. The shared
// password is configured per-environment (DEMO_PASSWORD on the server-side
// seed run) and shared with testers out-of-band — never baked into this
// bundle. Gate the whole panel behind VITE_DEMO_MODE so production builds
// never ship the demo phones.
const DEMO_ACCOUNTS: Array<{
  role: UserRole;
  phone: string;
  displayPhone: string;
  name: string;
}> = [
  { role: "resident", phone: "+254700000002", displayPhone: "0700 000 002", name: "Aisha Kamau" },
  { role: "admin",    phone: "+254700000001", displayPhone: "0700 000 001", name: "Daniel Ng'ong'a" },
  { role: "security", phone: "+254700000003", displayPhone: "0700 000 003", name: "James Otieno" },
  { role: "vendor",   phone: "+254700000004", displayPhone: "0700 000 004", name: "Grace Wanjiku" },
];

interface Props {
  onPick: (phone: string) => void;
}

export function DemoBench({ onPick }: Props) {
  if (import.meta.env.VITE_DEMO_MODE !== "1") return null;

  return (
    <div
      data-testid="demo-bench"
      className="mt-5 rounded-2xl border border-dashed border-brand-gold bg-brand-gold/10 p-3.5"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-brand-gold flex items-center justify-center shrink-0">
          <FlaskConical className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-gold-dark">
            Testing this app?
          </p>
          <p className="text-[11px] text-tribal-earth leading-tight">
            Tap a role. Ask the admin for the shared demo password.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {DEMO_ACCOUNTS.map((a) => {
          const r = ROLE_PRESENTATION[a.role];
          const Icon = r.Icon;
          return (
            <button
              key={a.phone}
              type="button"
              onClick={() => onPick(a.phone)}
              className={cn(
                "flex items-center gap-2 rounded-xl border bg-white px-2.5 py-2 text-left transition-colors hover:border-brand-green hover:bg-tribal-cream min-h-[56px]",
                r.chip.split(" ").find((c) => c.startsWith("border-")) ?? "border-tribal-border",
              )}
            >
              <div className={cn("shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                r.chip.split(" ").find((c) => c.startsWith("bg-")) ?? "bg-tribal-cream-dark")}>
                <Icon className={cn("h-4 w-4",
                  r.chip.split(" ").find((c) => c.startsWith("text-")) ?? "text-tribal-earth")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider leading-tight text-tribal-charcoal">
                  {r.label}
                </p>
                <p className="text-[11px] text-tribal-earth font-medium truncate leading-tight">
                  {a.displayPhone}
                </p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-tribal-muted shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
