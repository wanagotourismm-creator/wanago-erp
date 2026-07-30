import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, requireAdmin } from "@/lib/firebase/admin";
import { sendEmail } from "@/lib/server/notify-server";
import { getIntegrationSecret } from "@/lib/get-integration-secret";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// Lets an admin verify the Gmail SMTP / Resend config actually works right
// after saving it in Admin → Integrations, instead of saving blind and only
// finding out days later that real notification emails never arrived.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(bearerToken(req));
  if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server isn't configured for this yet" }, { status: 501 });

  const userDoc = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(admin.uid).get();
  const to = userDoc.data()?.email as string | undefined;
  if (!to) return NextResponse.json({ error: "Your account has no email on file to send a test to." }, { status: 400 });

  const result = await sendEmail({
    to,
    subject: "Test email from your ERP",
    body: "If you're reading this, your email integration is working correctly — Gmail SMTP or Resend (whichever is configured) successfully sent this.",
  });

  if (!result.ok) {
    // The generic "Email isn't set up yet" message means sendViaGmail found
    // neither field readable and Resend also isn't configured — surface
    // exactly which of the two Gmail fields the server actually sees, since
    // that can silently disagree with Admin → Integrations' "Configured"
    // badge (which only reflects that *something* non-empty was saved, not
    // that this request's read of the same doc found it).
    const gmailUser = await getIntegrationSecret("gmailUser", "GMAIL_USER");
    const gmailPass = await getIntegrationSecret("gmailAppPassword", "GMAIL_APP_PASSWORD");
    const diag = `[diagnostic: Gmail Address ${gmailUser ? "found" : "MISSING"}, App Password ${gmailPass ? "found" : "MISSING"}]`;
    return NextResponse.json({ error: `${result.error || "Failed to send test email"} ${diag}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true, sentTo: to });
}
