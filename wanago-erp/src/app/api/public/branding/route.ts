import { NextResponse } from "next/server";
import { getCompanySettingsServer } from "@/modules/admin/settings/services/company-settings.server";

export const runtime = "nodejs";

// The Firestore client SDK's settings/company read is gated to
// isAuthenticated() (that doc also holds bank details/UPI ID, so it can't
// be opened up for public read) — pre-login pages (staff login, portal
// login) and fully public pages (quick-inquiry, referral landing) have no
// session yet, so they fetch just this safe subset through the Admin SDK
// instead of the client settings/company doc.
export async function GET() {
  const company = await getCompanySettingsServer();
  return NextResponse.json({ businessName: company.businessName, logoUrl: company.logoUrl });
}
