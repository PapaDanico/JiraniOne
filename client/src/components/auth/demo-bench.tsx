import { ChevronRight, FlaskConical } from "lucide-react";
import { ROLE_PRESENTATION } from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { UserRole } from "@shared/types";

// Four hard-coded demo phones that match the seed script
// (server/src/seed.ts). The password is configured per-environment via
// DEMO_PASSWORD on the server-side seed run and shared with testers
// out-of-band — never baked into this bundle.
const DEMO_ACCOUNTS: Array<{
  role: UserRole;
  phone: string;
  displayPhone: string;
  name: string;
}> = [
  {
    role: "resident",
    phone: "+254700000002",
    displayPhone: "0700 000 002",
    name: "Aisha Kamau",
  },
  {
    role: "admin",
    phone: "+254700000001",
    displayPhone: "0700 000 001",
    name: "Daniel Ng'ong'a",
  },
  {
    role: "security",
    phone: "+254700000003",
    displayPhone: "0700 000 003",
    name: "James Otieno",
  },
  {
    role: "vendor",
    phone: "+254700000004",
    displayPhone: "0700 000 004",
    name: "Grace Wanjiku",
  },
];

interface Props {
  onPick: (phone: string) => void;
}

export function DemoBench({ onPick }: Props) {
  // Build-time flag set in client/.env: VITE_DEMO_MODE=1. When the flag is
  // off the bench renders nothing — production bundles should ship with
  // the flag unset so the demo phones don't leak into the live site.
  if (import.meta.env.VITE_DEMO_MODE !== "1") return null;

  return (
    <div
      data-testid="demo-bench"
      className="mt-5 rounded-2xl border border-dashed border-[#D4A017] bg-[#FFF8E1] p-3.5"
    >
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-7 h-7 rounded-lg bg-[#D4A017] flex items-center justify-center">
          <FlaskConical className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#9A6E00]">
            Testing this app?
          </p>
          <p className="text-[11px] text-[#6B5D45] leading-tight">
            Pick a role below. Ask the admin for the shared demo password.
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
                "flex items-center gap-2 rounded-xl border bg-white px-2.5 py-2 text-left transition-colors hover:border-[#1B5E20] hover:bg-[#F5F1E8]",
                "min-h-[56px]",
                r.chipBorder,
              )}
            >
              <div
                className={cn(
                  "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                  r.chipBg,
                )}
              >
                <Icon className={cn("h-4 w-4", r.chipFg)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-[11px] font-bold uppercase tracking-wider leading-tight", r.chipFg)}>
                  {r.label}
                </p>
                <p className="text-[11px] text-[#212121] font-semibold truncate leading-tight">
                  {a.displayPhone}
                </p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-[#B0A080] shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
