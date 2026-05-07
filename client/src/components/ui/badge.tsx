import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:     "bg-[#1B5E20]/12 text-[#1B5E20]",
        secondary:   "bg-[#D4C9A8]/60 text-[#6B5D45]",
        destructive: "bg-[#B71C1C]/10 text-[#B71C1C]",
        warning:     "bg-amber-100 text-amber-800",
        info:        "bg-blue-100 text-blue-700",
        success:     "bg-emerald-100 text-emerald-800",
        urgent:      "bg-[#B71C1C] text-white",
        gold:        "bg-[#D4A017]/15 text-[#9A6E00]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
