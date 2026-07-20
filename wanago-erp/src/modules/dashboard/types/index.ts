export type DashboardStats = {
  totalRevenue:      number;
  activeLeads:       number;
  confirmedBookings: number;
  pendingDues:       number;
  overdueInvoices:   number;
  newLeads:          number;
  followUpPending:   number;
  totalLeads:        number;
  // Executive cockpit additions — computed straight off existing module
  // collections (bookings/payments/expenses/leads), not a GL/BI engine.
  // TODO: switch these to read from the general ledger + BI engine once
  // those 4.0 pillars land; the shape here should stay compatible.
  cashPosition:      number;
  grossMarginPct:    number | null; // null when no bookings have profitAmount set yet
  pipelineValue:     number;
  arOverdueAmount:   number;
};

export type LeadPipelineItem = {
  stage: string;
  count: number;
  color: string;
};

export type RevenueDataPoint = {
  month: string;
  amount: number;
};

// Two of the five PRD-listed alert types — "low resource availability"
// (Resources module isn't built yet, Release 1 Tool 5) and "statutory
// due-dates" (no tax-calendar concept anywhere, a Release 2 catalog item)
// — are intentionally not modeled here since there's no real data behind
// them yet. Extend this union once those exist instead of faking alerts.
export type CockpitAlertType = "overdue_invoice" | "negative_margin_booking";

export type CockpitAlertSeverity = "high" | "medium";

export type CockpitAlert = {
  id:       string;
  type:     CockpitAlertType;
  title:    string;
  detail:   string;
  href:     string;
  severity: CockpitAlertSeverity;
};

export type CockpitFilters = {
  officeId:   string | "all";
  rangeStart: Date;
  rangeEnd:   Date;
};
