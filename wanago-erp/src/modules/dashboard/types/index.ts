export type DashboardStats = {
  totalRevenue:      number;
  activeLeads:       number;
  confirmedBookings: number;
  pendingDues:       number;
  overdueInvoices:   number;
  newLeads:          number;
  followUpPending:   number;
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
