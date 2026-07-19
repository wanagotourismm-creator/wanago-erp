"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, RotateCw, Home } from "lucide-react";
import { cn } from "@/lib/utils/helpers";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
  className?: string;
};

// Shared fallback UI for every route's error.tsx (and a component-level
// boundary would use it too) — one bad Firestore document or a thrown
// exception anywhere in a page renders this instead of a blank white
// screen, with a reference id (Next.js' error.digest) support can search
// for in GlitchTip/Sentry by.
export function ErrorFallback({ error, reset, className }: Props) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error("[ErrorFallback]", error);
  }, [error]);

  return (
    <div className={cn("flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center", className)}>
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle size={24} />
      </div>
      <p className="text-base font-semibold text-foreground">Something went wrong</p>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        This page hit an unexpected error. It&apos;s been logged — retrying usually clears it.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[11px] text-muted-foreground/70">Ref: {error.digest}</p>
      )}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors shadow-sm"
        >
          <RotateCw size={14} /> Try again
        </button>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
        >
          <Home size={14} /> Go to Dashboard
        </a>
      </div>
    </div>
  );
}
