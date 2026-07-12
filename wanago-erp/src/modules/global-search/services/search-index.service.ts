import { fetchCustomers } from "@/modules/customers/services/customer.service";
import { fetchLeads } from "@/modules/leads/services/lead.service";
import { fetchBookings } from "@/modules/bookings/services/booking.service";
import { fetchItineraries } from "@/modules/itineraries/services/itinerary.service";
import { fetchQuotations } from "@/modules/quotations/services/quotation.service";
import { fetchCandidates } from "@/modules/recruitment/candidates/services/candidate.service";
import type { SearchResult } from "@/modules/global-search/types";

// Reuses each module's own fetch — same data, same permission boundary
// every role already sees on that module's own list page, so search never
// surfaces anything a user couldn't already find by browsing there. Each
// collection is fetched independently so one failing (e.g. a role without
// candidates access) doesn't blank out the rest of the index.
export async function buildSearchIndex(): Promise<SearchResult[]> {
  const [customers, leads, bookings, itineraries, quotations, candidates] = await Promise.all([
    fetchCustomers().catch(() => []),
    fetchLeads().catch(() => []),
    fetchBookings().catch(() => []),
    fetchItineraries().catch(() => []),
    fetchQuotations().catch(() => []),
    fetchCandidates().catch(() => []),
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
  ];
}
