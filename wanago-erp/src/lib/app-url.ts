// Shared by every place that builds an absolute link back into the app —
// email CTAs, PDF QR codes, referral share links, notification deep-links.
// Previously each call site duplicated its own `NEXT_PUBLIC_APP_URL ??
// "https://wanago-erp.vercel.app"` fallback (8+ copies) — falling back to
// Wanago's own live production URL is a real bug for a second tenant's
// deployment if their env var is ever unset, not just duplication. The
// fallback here is dev-safe instead.
export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
