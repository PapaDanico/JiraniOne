import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <div className="w-full">
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-lg border px-3 py-2.5 text-sm bg-white placeholder:text-gray-400 resize-y min-h-[100px]",
          "focus:outline-none focus:ring-2 focus:ring-[#1A5C38] focus:border-transparent",
          error ? "border-red-400" : "border-gray-300",
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  ),
);
Textarea.displayName = "Textarea";
