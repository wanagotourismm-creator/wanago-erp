import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { fetchCustomerTrackingDocs, loadLogoDataUriServer } from "@/lib/server/booking-portal";
import { generateQuotationPdfBlob } from "@/lib/pdf/quotation-pdf";
import { generateInvoicePdfBuffer } from "@/lib/pdf/invoice-pdf";
import { joinAddressCity, formatDate } from "@/lib/utils/helpers";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";

export const runtime = "nodejs";

// Same token-gated security boundary as the main booking-link route — this
// just adds "rebuild my quotation/invoice PDF fresh" on top, so the
// customer always gets the current numbers with no permanent PDF storage.

async function findLeadByToken(token: string) {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db.collection(FIRESTORE_COLLECTIONS.LEADS)
    .where("bookingLinkToken", "==", token)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as { id: string; matchedCustomerId?: string | null };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const type = req.nextUrl.searchParams.get("type");
  if (type !== "quotation" && type !== "invoice") {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }

  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 500 });

  const lead = await findLeadByToken(token);
  if (!lead?.matchedCustomerId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [docs, companySnap] = await Promise.all([
    fetchCustomerTrackingDocs(db, lead.matchedCustomerId),
    db.collection(FIRESTORE_COLLECTIONS.SETTINGS).doc("company").get(),
  ]);
  const company = companySnap.exists ? companySnap.data()! : {};

  if (type === "quotation") {
    const q = docs.quotation as {
      refNumber: string; createdAt: { toDate?: () => Date }; customerName: string; customerPhone: string;
      lineItems: { description: string; amount: number }[]; subtotal: number; totalAmount: number; pax: number;
    } | null;
    if (!q) return NextResponse.json({ error: "No quotation found" }, { status: 404 });

    const customerSnap = await db.collection(FIRESTORE_COLLECTIONS.CUSTOMERS).doc(lead.matchedCustomerId).get();
    const customer = customerSnap.exists ? customerSnap.data()! : {};

    const logoDataUrl = await loadLogoDataUriServer();
    const blob = await generateQuotationPdfBlob({
      refNumber: q.refNumber,
      date: q.createdAt?.toDate ? formatDate(q.createdAt.toDate(), "dd/MM/yyyy") : formatDate(new Date(), "dd/MM/yyyy"),
      company: {
        businessName: company.businessName ?? "Wanago Tours & Travels",
        addressLine: joinAddressCity(company.address, company.city),
        phone: company.phone || undefined,
        gstNumber: company.gstEnabled ? company.gstNumber || undefined : undefined,
      },
      customer: {
        name: q.customerName,
        addressLine: customer.address ?? undefined,
        phone: q.customerPhone,
      },
      lineItems: q.lineItems.map((li) => ({
        description: li.description, pax: q.pax || null, price: li.amount, total: li.amount * (q.pax || 1),
      })),
      subtotal: q.subtotal,
      grandTotal: q.totalAmount,
      bank: {
        accountName: company.bankAccountName || company.businessName, accountNumber: company.bankAccountNumber,
        ifsc: company.bankIfscCode, bankName: company.bankName, qrDataUrl: company.paymentQrUrl || null,
      },
      terms: (company.quotationTerms ?? "").split("\n").map((t: string) => t.trim()).filter(Boolean),
      logoDataUrl,
      websiteUrl: "www.wanago.in",
      socialHandle: "@wana.go",
    });
    const buffer = Buffer.from(await blob.arrayBuffer());
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Quotation-${q.refNumber}.pdf"`,
      },
    });
  }

  const inv = docs.invoice as {
    refNumber: string; issueDate: string; dueDate: string | null; customerName: string; customerPhone: string;
    totalAmount: number; taxAmount?: number | null; taxRate?: number | null; amountPaid: number; balanceDue: number; notes: string | null;
    bookingRef: string | null;
  } | null;
  if (!inv) return NextResponse.json({ error: "No invoice found" }, { status: 404 });

  const taxAmount = inv.taxAmount ?? 0;
  const subtotal = inv.totalAmount - taxAmount;
  const logoDataUrl = await loadLogoDataUriServer();
  const description = inv.bookingRef ? `Booking ${inv.bookingRef}` : "Services rendered";
  const buffer = await generateInvoicePdfBuffer({
    refNumber: inv.refNumber,
    date: formatDate(inv.issueDate, "dd/MM/yyyy"),
    dueDate: inv.dueDate ? formatDate(inv.dueDate, "dd/MM/yyyy") : null,
    company: {
      businessName: company.businessName ?? "Wanago Tours & Travels",
      addressLine: joinAddressCity(company.address, company.city),
      phone: company.phone || undefined,
      gstNumber: company.gstEnabled ? company.gstNumber || undefined : undefined,
    },
    customer: { name: inv.customerName, phone: inv.customerPhone },
    lineItems: [{ description, pax: null, price: subtotal, total: inv.totalAmount }],
    subtotal, grandTotal: inv.totalAmount,
    amountPaid: inv.amountPaid, balanceDue: inv.balanceDue,
    bank: {
      accountName: company.bankAccountName || company.businessName, accountNumber: company.bankAccountNumber,
      ifsc: company.bankIfscCode, bankName: company.bankName, qrDataUrl: company.paymentQrUrl || null,
    },
    logoDataUrl: logoDataUrl ?? "",
    websiteUrl: "www.wanago.in",
    socialHandle: "@wana.go",
  });

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Invoice-${inv.refNumber}.pdf"`,
    },
  });
}
