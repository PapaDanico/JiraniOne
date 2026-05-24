import { forwardRef, useImperativeHandle, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { Eye, EyeOff, Lock, Phone, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { loginSchema, type LoginInput } from "@shared/validators";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Imperative handle exposed so a parent (e.g. DemoBench) can pre-fill the
// phone field and shift focus to the password input.
export interface LoginFormHandle {
  setPhone: (phone: string) => void;
  focusPassword: () => void;
}

export const LoginForm = forwardRef<LoginFormHandle>(function LoginForm(_props, ref) {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  useImperativeHandle(ref, () => ({
    setPhone: (phone: string) => {
      const local = phone.startsWith("+254")
        ? phone.slice(4)
        : phone.startsWith("254")
          ? phone.slice(3)
          : phone;
      setValue("phone", local, { shouldValidate: false });
    },
    focusPassword: () => setFocus("password"),
  }));

  const onSubmit = async (data: LoginInput) => {
    setError(null);
    try {
      await login(data.phone, data.password);
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Login failed. Check your credentials.",
      );
    }
  };

  const inputBase =
    "w-full rounded-xl border bg-white pl-12 pr-3 py-3 text-sm text-tribal-charcoal " +
    "placeholder:text-tribal-muted min-h-[48px] transition-shadow " +
    "focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="phone" className="text-tribal-charcoal font-semibold text-sm">
          Phone number
        </Label>
        <div className="relative mt-1.5">
          <span className="absolute inset-y-0 left-0 flex items-center gap-1.5 pl-3 text-tribal-earth pointer-events-none">
            <Phone className="h-4 w-4" />
            <span className="text-xs font-semibold tracking-tight">+254</span>
          </span>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="722 123 456"
            className={cn(
              inputBase,
              "pl-[5.25rem]",
              errors.phone
                ? "border-brand-red focus:ring-brand-red/30 focus:border-brand-red"
                : "border-tribal-border",
            )}
            {...register("phone")}
          />
        </div>
        {errors.phone?.message && (
          <p className="mt-1.5 text-xs text-brand-red flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.phone.message}
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-tribal-charcoal font-semibold text-sm">
            Password
          </Label>
          <Link
            href="/forgot-password"
            className="text-xs font-semibold text-brand-green hover:underline"
          >
            Forgot?
          </Link>
        </div>
        <div className="relative mt-1.5">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-tribal-earth pointer-events-none">
            <Lock className="h-4 w-4" />
          </span>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            className={cn(
              inputBase,
              "pr-12",
              errors.password
                ? "border-brand-red focus:ring-brand-red/30 focus:border-brand-red"
                : "border-tribal-border",
            )}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-tribal-earth hover:text-brand-green transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password?.message && (
          <p className="mt-1.5 text-xs text-brand-red flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.password.message}
          </p>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl bg-brand-red/10 border border-brand-red/30 px-3 py-2.5 text-sm text-brand-red flex items-start gap-2"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="submit"
        className="w-full text-base py-3 min-h-[48px] shadow-md shadow-brand-green/20"
        loading={isSubmitting}
      >
        {isSubmitting ? "Signing in…" : "Sign In"}
      </Button>
    </form>
  );
});
