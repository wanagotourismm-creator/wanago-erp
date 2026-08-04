import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { sendTallyExportEmail } from "@/lib/server/notify-server";
import { fetchUsersByPermission } from "@/lib/notify-recipients";
import { buildTallyVouchers, buildTallyXml, buildTallyCsv } from "@/modules/accounting/tally/services/tally-export.service";
import { getCompanySettingsServer } from "@/modules/admin/settings/services/company-settings.server";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import type { Invoice } from "@/modules/invoices/types";
import type { Payment } from "@/modules/payments/types";
import type { Expense } from "@/modules/expenses/types";
import type { TallyMapping } from "@/modules/accounting/tally/types";

export const runtime = "nodejs";

const BUCKET = "app-uploads";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// Reads everything via the Admin SDK (bypassing security rules), same
// convention as daily-reminders/route.ts — there's no signed-in user in a
// cron invocation for the client SDK (which tally-export.service.ts's own
// fetchExportData relies on) to authenticate as. Only the pure, Firestore-
// free functions from that service (buildTallyVouchers/buildTallyXml/
// buildTallyCsv) are reused here.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Admin SDK not configured" }, { status: 500 });

  // Always exports the month that just ended — this cron is scheduled for
  // the 1st of the month (see vercel.json), so "now" is already in the new
  // month and the target period is the one before it.
  const now = new Date();
  const periodMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const periodYear  = periodMonthDate.getFullYear();
  const periodMonth = periodMonthDate.getMonth(); // 0-indexed
  const periodStart = `${periodYear}-${pad2(periodMonth + 1)}-01`;
  const periodEndDate = new Date(periodYear, periodMonth + 1, 0); // last day of the month
  const periodEnd = `${periodYear}-${pad2(periodMonth + 1)}-${pad2(periodEndDate.getDate())}`;
  const periodLabel = periodMonthDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const [invoicesSnap, paymentsSnap, expensesSnap, mappingsSnap] = await Promise.all([
    db.collection(FIRESTORE_COLLECTIONS.INVOICES).get(),
    db.collection(FIRESTORE_COLLECTIONS.PAYMENTS).get(),
    db.collection(FIRESTORE_COLLECTIONS.EXPENSES).get(),
    db.collection(FIRESTORE_COLLECTIONS.TALLY_MAPPINGS).get(),
  ]);

  // Same filters as tally-export.service.ts's fetchExportData — only
  // approved invoices and actually-paid expenses belong in the books.
  const invoices = invoicesSnap.docs
    .map(d => ({ id: d.id, ...d.data() }) as Invoice)
    .filter(i => i.financeApprovalStatus === "approved" && i.issueDate >= periodStart && i.issueDate <= periodEnd);
  const payments = paymentsSnap.docs
    .map(d => ({ id: d.id, ...d.data() }) as Payment)
    .filter(p => p.paymentDate >= periodStart && p.paymentDate <= periodEnd);
  const expenses = expensesSnap.docs
    .map(d => ({ id: d.id, ...d.data() }) as Expense)
    .filter(e => e.expenseStatus === "paid" && e.expenseDate >= periodStart && e.expenseDate <= periodEnd);
  const mappings = mappingsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as TallyMapping);

  if (invoices.length + payments.length + expenses.length === 0) {
    return NextResponse.json({ ok: true, skipped: "no activity for period", periodStart, periodEnd });
  }

  const company = await getCompanySettingsServer();
  const { vouchers, unmappedExpenseCategories } = buildTallyVouchers({ invoices, payments, expenses }, mappings);
  const xml = buildTallyXml(vouchers, company.businessName);
  const csv = buildTallyCsv(vouchers);

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Storage not configured" }, { status: 500 });

  const basePath = `tally-exports/${periodYear}-${pad2(periodMonth + 1)}`;
  const [xmlUpload, csvUpload] = await Promise.all([
    supabase.storage.from(BUCKET).upload(`${basePath}.xml`, xml, { contentType: "application/xml", upsert: true }),
    supabase.storage.from(BUCKET).upload(`${basePath}.csv`, csv, { contentType: "text/csv", upsert: true }),
  ]);
  if (xmlUpload.error || csvUpload.error) {
    return NextResponse.json({ error: "Upload failed", detail: xmlUpload.error?.message ?? csvUpload.error?.message }, { status: 500 });
  }
  const xmlUrl = supabase.storage.from(BUCKET).getPublicUrl(`${basePath}.xml`).data.publicUrl;
  const csvUrl = supabase.storage.from(BUCKET).getPublicUrl(`${basePath}.csv`).data.publicUrl;

  await db.collection(FIRESTORE_COLLECTIONS.TALLY_EXPORTS).add({
    periodStart, periodEnd, format: "xml",
    invoiceCount: invoices.length, paymentCount: payments.length, expenseCount: expenses.length,
    unmappedExpenseCategories,
    exportedBy: "cron", exportedByName: "Monthly auto-export",
    status: "active",
    createdBy: "cron",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const financeUsers = await fetchUsersByPermission("finance:edit");
  let emailsSent = 0;
  for (const staff of financeUsers) {
    if (!staff.email) continue;
    const result = await sendTallyExportEmail({
      to: staff.email, periodLabel,
      invoiceCount: invoices.length, paymentCount: payments.length, expenseCount: expenses.length,
      xmlUrl, csvUrl,
    });
    if (result.ok) emailsSent++;
  }

  return NextResponse.json({
    ok: true, periodStart, periodEnd,
    invoiceCount: invoices.length, paymentCount: payments.length, expenseCount: expenses.length,
    unmappedExpenseCategories, emailsSent,
  });
}
