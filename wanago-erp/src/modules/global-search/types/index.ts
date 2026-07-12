export type SearchEntityType = "customer" | "lead" | "booking" | "itinerary" | "quotation" | "candidate";

export type SearchResult = {
  id: string;
  entityType: SearchEntityType;
  title: string;
  subtitle: string;
  href: string;
};

export const SEARCH_ENTITY_LABELS: Record<SearchEntityType, string> = {
  customer:  "Customers",
  lead:      "Leads",
  booking:   "Bookings",
  itinerary: "Itineraries",
  quotation: "Quotations",
  candidate: "Candidates",
};
