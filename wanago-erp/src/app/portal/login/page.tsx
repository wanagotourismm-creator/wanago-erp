"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, User, Briefcase } from "lucide-react";
import { portalLogin, type PortalType } from "@/modules/portal/services/portal-auth.service";
import { usePortalAuth } from "@/modules/portal/hooks/usePortalAuth";
import { cn } from "@/lib/utils/helpers";
import { usePublicBranding } from "@/modules/admin/settings/hooks/usePublicBranding";

// useSearchParams() (to read ?type=partner) requires a Suspense boundary
// above it or Next.js can't statically prerender this page — the actual
// logic lives in PortalLoginForm below, this default export just supplies
// that boundary.
export default function PortalLoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    }>
      <PortalLoginForm />
    </Suspense>
  );
}

function PortalLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signedIn, portalType: signedInType, loading: authLoading } = usePortalAuth();
  const company = usePublicBranding();

  const [portalType, setPortalType] = useState<PortalType>(
    searchParams.get("type") === "partner" ? "partner" : "customer"
  );
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && signedIn && signedInType) {
      router.replace(`/portal/${signedInType}`);
    }
  }, [authLoading, signedIn, signedInType, router]);

  async function handleSubmit() {
    if (phone.trim().length < 10 || code.trim().length < 3) {
      setError("Enter your phone number and referral code.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await portalLogin(portalType, phone, code);
    if ("error" in result) {
      setError(result.error);
      setSubmitting(false);
    } else {
      router.replace(`/portal/${portalType}`);
    }
  }

  if (authLoading || (signedIn && signedInType)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <img src="/images/logo-dark-clean.png" alt={company.businessName} className="mx-auto h-8 w-auto dark:hidden" />
          <img src="/images/logo-white-clean.png" alt={company.businessName} className="mx-auto hidden h-8 w-auto dark:block" />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-center text-lg font-bold text-foreground">Refer &amp; Earn Portal</h1>
          <p className="mt-1 text-center text-xs text-muted-foreground">Sign in with your phone number and referral code</p>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              onClick={() => setPortalType("customer")}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 text-xs font-semibold transition-all",
                portalType === "customer" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              <User size={16} /> Customer
            </button>
            <button
              onClick={() => setPortalType("partner")}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 text-xs font-semibold transition-all",
                portalType === "partner" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              <Briefcase size={16} /> Referral Executive
            </button>
          </div>

          <div className="mt-5 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Phone Number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Referral Code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. REF8K2N1X"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-mono outline-none focus:border-primary"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Don&apos;t have a code? Ask {company.businessName} staff for yours.</p>
            </div>

            {error && <p className="text-xs font-medium text-destructive">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
