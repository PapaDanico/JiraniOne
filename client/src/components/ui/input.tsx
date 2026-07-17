import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <div className="w-full">
      <input
        ref={ref}
        className={cn(
          "w-full rounded-lg border px-3 py-2.5 text-sm bg-white text-gray-900 placeholder:text-gray-400 min-h-[44px]",
          "focus:outline-none focus:ring-2 focus:ring-[#1A5C38] focus:border-transparent",
          "disabled:bg-gray-50 disabled:cursor-not-allowed",
          error ? "border-red-400 focus:ring-red-400" : "border-gray-300",
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  ),
);
Input.displayName = "Input";
