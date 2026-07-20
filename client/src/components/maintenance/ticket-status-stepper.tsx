import { Check } from "lucide-react";
import type { TicketStatus } from "@shared/types";

// "closed" isn't its own visual stage — it's an administrative wrap-up after
// resolution, not a step a resident is waiting on. Mapped onto the same
// final dot as "resolved" so the stepper still reads as complete.
const STEPS: { status: TicketStatus; label: string }[] = [
  { status: "open", label: "Reported" },
  { status: "assigned", label: "Assigned" },
  { status: "in_progress", label: "In Progress" },
  { status: "resolved", label: "Resolved" },
];

function stepIndex(status: TicketStatus): number {
  if (status === "closed") return 3;
  const i = STEPS.findIndex((s) => s.status === status);
  return i === -1 ? 0 : i;
}

export function TicketStatusStepper({ status }: { status: TicketStatus }) {
  const current = stepIndex(status);

  return (
    <div className="flex items-center w-full" role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={STEPS.length - 1}>
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={step.status} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors ${
                  done || active
                    ? "bg-[#1B5E20] border-[#1B5E20] text-white"
                    : "bg-white border-[#D4C9A8] text-transparent"
                }`}
              >
                {done ? <Check className="h-3 w-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
              </div>
              <span
                className={`text-[9px] font-semibold text-center leading-tight whitespace-nowrap ${
                  active ? "text-[#1B5E20]" : done ? "text-[#6B5D45]" : "text-[#D4C9A8]"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 -mt-4 ${done ? "bg-[#1B5E20]" : "bg-[#D4C9A8]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
