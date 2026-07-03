"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { loginSchema, type LoginSchema } from "@/modules/auth/schemas";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { cn } from "@/lib/utils/helpers";

type Props = {
  onForgotPassword: () => void;
};

export function LoginForm({ onForgotPassword }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginSchema) {
    setServerError(null);
    const { error } = await login(data.email, data.password);
    if (error) setServerError(error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

      {/* Server error */}
      {serverError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@wanago.com"
          {...register("email")}
          className={cn(
            "w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition-colors",
            "placeholder:text-muted-foreground",
            "focus:border-primary focus:ring-2 focus:ring-primary/20",
            errors.email ? "border-destructive" : "border-input"
          )}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-xs text-primary hover:underline"
          >
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            {...register("password")}
            className={cn(
              "w-full rounded-lg border bg-background px-3 py-2.5 pr-10 text-sm outline-none transition-colors",
              "placeholder:text-muted-foreground",
              "focus:border-primary focus:ring-2 focus:ring-primary/20",
              errors.password ? "border-destructive" : "border-input"
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors",
          "bg-primary hover:bg-primary/90 focus:ring-2 focus:ring-primary/30",
          "disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign in"
        )}
      </button>

    </form>
  );
}
