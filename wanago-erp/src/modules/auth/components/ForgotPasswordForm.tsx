"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { forgotPasswordSchema, type ForgotPasswordSchema } from "@/modules/auth/schemas";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { cn } from "@/lib/utils/helpers";

type Props = {
  onBack: () => void;
};

export function ForgotPasswordForm({ onBack }: Props) {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { forgotPassword } = useAuth();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordSchema) {
    setServerError(null);
    const { error } = await forgotPassword(data.email);
    if (error) setServerError(error);
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <CheckCircle2 size={48} className="text-primary" />
        </div>
        <div>
          <p className="font-medium text-foreground">Check your email</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We sent a password reset link to{" "}
            <span className="font-medium text-foreground">{getValues("email")}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-primary hover:underline"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

      <p className="text-sm text-muted-foreground">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      {serverError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="reset-email" className="text-sm font-medium text-foreground">
          Email address
        </label>
        <input
          id="reset-email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
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
            Sending...
          </>
        ) : (
          "Send reset link"
        )}
      </button>

      <button
        type="button"
        onClick={onBack}
        className="flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Back to sign in
      </button>

    </form>
  );
}
