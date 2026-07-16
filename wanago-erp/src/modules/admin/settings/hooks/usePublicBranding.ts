"use client";

import { useState, useEffect } from "react";
import { DEFAULT_COMPANY_SETTINGS } from "@/modules/admin/settings/services/company-settings.service";

type PublicBranding = { businessName: string; logoUrl: string };

const DEFAULT_BRANDING: PublicBranding = {
  businessName: DEFAULT_COMPANY_SETTINGS.businessName,
  logoUrl: DEFAULT_COMPANY_SETTINGS.logoUrl,
};

// Authenticated pages use useCompanySettings() (reads settings/company
// straight from Firestore). Pre-login and fully public pages have no
// session yet, so they hit /api/public/branding instead — see that route
// for why the direct Firestore read doesn't work here.
export function usePublicBranding(): PublicBranding {
  const [branding, setBranding] = useState<PublicBranding>(DEFAULT_BRANDING);

  useEffect(() => {
    fetch("/api/public/branding")
      .then((res) => (res.ok ? res.json() : DEFAULT_BRANDING))
      .then(setBranding)
      .catch(() => {});
  }, []);

  return branding;
}
