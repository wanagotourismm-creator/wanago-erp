"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";
import { loginSchema, type LoginSchema } from "@/modules/auth/schemas";
import { useAuth } from "@/modules/auth/hooks/useAuth";

type Props = { onForgotPassword: () => void };

export function LoginForm({ onForgotPassword }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError,  setServerError]  = useState<string | null>(null);
  const { login } = useAuth();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginSchema) {
    setServerError(null);
    const { error } = await login(data.email, data.password);
    if (error) setServerError(error);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

      {serverError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {serverError}
        </div>
      )}

      {/* Email */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Username or Email
        </label>
        <div className="relative">
          <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            {...register("email")}
            className="login-field w-full rounded-2xl border-[1.5px] border-gray-200 bg-gray-50 py-3.5 pl-10 pr-4 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400"
          />
        </div>
        {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Password</label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="login-link text-xs font-medium hover:underline transition-opacity"
          >
            Forget password?
          </button>
        </div>
        <div className="relative">
          <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            {...register("password")}
            className="login-field w-full rounded-2xl border-[1.5px] border-gray-200 bg-gray-50 py-3.5 pl-10 pr-11 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={() => setShowPassword(p => !p)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="login-btn flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
      >
        {isSubmitting ? <><Loader2 size={15} className="animate-spin" /> Signing in...</> : "Sign in"}
      </button>

      {/* Theme-aware styles */}
      <style>{`
        .login-field:hover  { border-color: color-mix(in srgb, var(--login-color, hsl(146 58% 28%)) 50%, transparent); }
        .login-field:focus  {
          border-color: var(--login-color, hsl(146 58% 28%)) !important;
          background: #fff;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--login-color, hsl(146 58% 28%)) 20%, transparent) !important;
        }
        .login-btn {
          background: var(--login-color, hsl(146 58% 28%));
          box-shadow: 0 4px 16px color-mix(in srgb, var(--login-color, hsl(146 58% 28%)) 45%, transparent);
        }
        .login-btn:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px color-mix(in srgb, var(--login-color, hsl(146 58% 28%)) 55%, transparent);
        }
        .login-link { color: var(--login-color, hsl(146 58% 28%)); }
      `}</style>

    </form>
  );
}
