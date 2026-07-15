import { fetchCustomers } from "@/modules/customers/services/customer.service";
import { fetchLeads } from "@/modules/leads/services/lead.service";
import { fetchBookings } from "@/modules/bookings/services/booking.service";
import { fetchItineraries } from "@/modules/itineraries/services/itinerary.service";
import { fetchQuotations } from "@/modules/quotations/services/quotation.service";
import { fetchCandidates } from "@/modules/recruitment/candidates/services/candidate.service";
import { fetchInvoices } from "@/modules/invoices/services/invoice.service";
import { fetchPayments } from "@/modules/payments/services/payment.service";
import { fetchSuppliers } from "@/modules/suppliers/services/supplier.service";
import { fetchPackages } from "@/modules/packages/services/package.service";
import { fetchExpenses } from "@/modules/expenses/services/expense.service";
import { fetchCampaigns } from "@/modules/campaigns/services/campaign.service";
import { fetchEmployees } from "@/modules/hrms/employees/services/employee.service";
import type { SearchResult } from "@/modules/global-search/types";

// Reuses each module's own fetch — same data, same permission boundary
// every role already sees on that module's own list page, so search never
// surfaces anything a user couldn't already find by browsing there. Each
// collection is fetched independently so one failing (e.g. a role without
// candidates access) doesn't blank out the rest of the index.
export async function buildSearchIndex(): Promise<SearchResult[]> {
  const [
    customers, leads, bookings, itineraries, quotations, candidates,
    invoices, payments, suppliers, packages, expenses, campaigns, employees,
  ] = await Promise.all([
    fetchCustomers().catch(() => []),
    fetchLeads().catch(() => []),
    fetchBookings().catch(() => []),
    fetchItineraries().catch(() => []),
    fetchQuotations().catch(() => []),
    fetchCandidates().catch(() => []),
    fetchInvoices().catch(() => []),
    fetchPayments().catch(() => []),
    fetchSuppliers().catch(() => []),
    fetchPackages().catch(() => []),
    fetchExpenses().catch(() => []),
    fetchCampaigns().catch(() => []),
    fetchEmployees().catch(() => []),
  ]);

  return [
    ...customers.map((c): SearchResult => ({
      id: c.id, entityType: "customer",
      title: c.fullName, subtitle: c.phone,
      href: `/customers?view=${c.id}`,
    })),
    ...leads.map((l): SearchResult => ({
      id: l.id, entityType: "lead",
      title: l.name, subtitle: l.destination,
      href: `/leads?view=${l.id}`,
    })),
    ...bookings.map((b): SearchResult => ({
      id: b.id, entityType: "booking",
      title: b.customerName, subtitle: `${b.destination} · ${b.refNumber}`,
      href: `/bookings?view=${b.id}`,
    })),
    ...itineraries.map((i): SearchResult => ({
      id: i.id, entityType: "itinerary",
      title: i.title, subtitle: i.destination,
      href: `/itineraries?view=${i.id}`,
    })),
    ...quotations.map((q): SearchResult => ({
      id: q.id, entityType: "quotation",
      title: q.customerName, subtitle: `${q.destination} · ${q.refNumber}`,
      href: `/quotations?view=${q.id}`,
    })),
    ...candidates.map((c): SearchResult => ({
      id: c.id, entityType: "candidate",
      title: c.fullName, subtitle: c.jobOpeningTitle ?? c.source,
      href: `/recruitment?view=${c.id}`,
    })),
    // The 7 modules below don't have a `?view=<id>` deep-link on their list
    // page yet (only the 6 above do), so results land on the plain list
    // page rather than auto-opening the specific record — a fine first
    // step (findable at all beats not findable), deep-linking is a
    // follow-up once each page supports it.
    ...invoices.map((i): SearchResult => ({
      id: i.id, entityType: "invoice",
      title: i.customerName, subtitle: `${i.refNumber} · ${i.status}`,
      href: "/invoices",
    })),
    ...payments.map((p): SearchResult => ({
      id: p.id, entityType: "payment",
      title: p.customerName, subtitle: p.refNumber,
      href: "/payments",
    })),
    ...suppliers.map((s): SearchResult => ({
      id: s.id, entityType: "supplier",
      title: s.name, subtitle: `${s.category} · ${s.refNumber}`,
      href: "/suppliers",
    })),
    ...packages.map((p): SearchResult => ({
      id: p.id, entityType: "package",
      title: p.title, subtitle: `${p.destination} · ${p.refNumber}`,
      href: "/packages",
    })),
    ...expenses.map((e): SearchResult => ({
      id: e.id, entityType: "expense",
      title: e.vendor ?? e.category, subtitle: `${e.category} · ${e.refNumber}`,
      href: "/expenses",
    })),
    ...campaigns.map((c): SearchResult => ({
      id: c.id, entityType: "campaign",
      title: c.name, subtitle: c.refNumber,
      href: "/campaigns",
    })),
    ...employees.map((e): SearchResult => ({
      id: e.id, entityType: "employee",
      title: e.fullName, subtitle: `${e.designation} · ${e.department}`,
      href: "/hrms/employees",
    })),
  ];
}
