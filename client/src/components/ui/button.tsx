import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E20]/40",
  {
    variants: {
      variant: {
        default:     "bg-[#1B5E20] text-white hover:bg-[#0D3B11]",
        secondary:   "border border-[#D4C9A8] bg-[#F5F1E8] text-[#212121] hover:bg-[#EDE7D8]",
        destructive: "bg-[#B71C1C] text-white hover:bg-[#8B0000]",
        ghost:       "hover:bg-[#EDE7D8] text-[#212121]",
        link:        "text-[#1B5E20] underline-offset-4 hover:underline",
        amber:       "bg-[#D47A00] text-white hover:bg-[#A05800]",
        gold:        "bg-[#D4A017] text-white hover:bg-[#B8860B]",
        outline:     "border border-[#1B5E20] text-[#1B5E20] hover:bg-[#1B5E20] hover:text-white",
      },
      size: {
        default: "px-4 py-2.5",
        // Denser padding/type than "default", but the tap target itself
        // still meets the 44px minimum (inherited from the base class) —
        // budget Android touch accuracy doesn't get better just because
        // the button is labeled "secondary action".
        sm:      "px-3 py-2 text-xs",
        lg:      "px-6 py-3 text-base",
        icon:    "p-2 min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

export { buttonVariants };
