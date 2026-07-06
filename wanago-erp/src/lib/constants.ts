// ─────────────────────────────────────────────────
// WANAGO ERP — App Constants (Single Source of Truth)
// ─────────────────────────────────────────────────

export const LEAD_STAGES = {
  NEW:         "new",
  CONTACTED:   "contacted",
  FOLLOW_UP:   "follow_up",
  QUOTED:      "quoted",
  NEGOTIATION: "negotiation",
  WON:         "won",
  LOST:        "lost",
} as const;

export type LeadStage = (typeof LEAD_STAGES)[keyof typeof LEAD_STAGES];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new:         "New",
  contacted:   "Contacted",
  follow_up:   "Follow-up",
  quoted:      "Quoted",
  negotiation: "Negotiation",
  won:         "Won",
  lost:        "Lost",
};

export const BOOKING_STATUS = {
  PENDING_FINANCE:  "pending_finance",
  FINANCE_APPROVED: "finance_approved",
  OPS_PENDING:      "ops_pending",
  CONFIRMED:        "confirmed",
  COMPLETED:        "completed",
  CANCELLED:        "cancelled",
} as const;

export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending_finance:  "Pending Finance",
  finance_approved: "Finance Approved",
  ops_pending:      "Ops Pending",
  confirmed:        "Confirmed",
  completed:        "Completed",
  cancelled:        "Cancelled",
};

export const PAYMENT_STATUS = {
  PAID:    "paid",
  PARTIAL: "partial",
  UNPAID:  "unpaid",
  OVERDUE: "overdue",
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const INVOICE_STATUS = {
  DRAFT:   "draft",
  SENT:    "sent",
  UNPAID:  "unpaid",
  PARTIAL: "partial",
  PAID:    "paid",
  OVERDUE: "overdue",
} as const;

export type InvoiceStatus = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft:   "Draft",
  sent:    "Sent",
  unpaid:  "Unpaid",
  partial: "Partially Paid",
  paid:    "Paid",
  overdue: "Overdue",
};

export const PRIORITY = {
  HOT:  "hot",
  WARM: "warm",
  COLD: "cold",
} as const;

export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY];

export const TRIP_TYPES = {
  INTERNATIONAL: "international",
  DOMESTIC:      "domestic",
  HONEYMOON:     "honeymoon",
  GROUP:         "group",
  ADVENTURE:     "adventure",
  CORPORATE:     "corporate",
} as const;

export const FIRESTORE_COLLECTIONS = {
  LEADS:             "leads",
  CUSTOMERS:         "customers",
  QUOTATIONS:        "quotations",
  PACKAGES:          "packages",
  BOOKINGS:          "bookings",
  INVOICES:          "invoices",
  PAYMENTS:          "payments",
  EXPENSES:          "expenses",
  CAMPAIGNS:         "campaigns",
  SEGMENTS:          "segments",
  ACTIVITIES:        "activities",
  TICKETS:           "tickets",
  HRMS_EMPLOYEES:    "hrmsEmployees",
  HRMS_LEAVES:       "hrmsLeaves",
  HRMS_PAYROLL:      "hrmsPayroll",
  HRMS_CHECK_INS:    "hrmsCheckIns",
  ITINERARIES:       "itineraries",
  SUPPLIERS:         "suppliers",
  TASKS:             "tasks",
  REWARDS:           "rewards",
  NOTIFICATIONS:     "notifications",
  USERS:             "users",
  OFFICES:           "offices",
  SETTINGS:          "settings",
  TEAMSPACE_CHANNELS:      "teamspaceChannels",
  TEAMSPACE_CONVERSATIONS: "teamspaceConversations",
  TEAMSPACE_MESSAGES:      "teamspaceMessages",
  HOLIDAYS:          "holidays",
  TRASH:             "trash",
  JOB_OPENINGS:      "jobOpenings",
  CANDIDATES:        "candidates",
  PERFORMANCE_GOALS:   "performanceGoals",
  PERFORMANCE_REVIEWS: "performanceReviews",
  TRAINING_PROGRAMS:    "trainingPrograms",
  TRAINING_ENROLLMENTS: "trainingEnrollments",
  HRMS_REGULARIZATIONS: "hrmsRegularizations",
  ASSETS:          "assets",
  ASSET_REQUESTS:  "assetRequests",
  COMPANY_GOALS:   "companyGoals",
  OBJECTIVES:      "objectives",
  GOAL_CHECKINS:   "goalCheckIns",
  HELP_ARTICLES:   "helpArticles",
} as const;

export const DEFAULT_LEAD_SOURCES = [
  "Instagram",
  "Facebook",
  "WhatsApp",
  "Walk-in",
  "Referral",
  "Website",
  "Google",
  "YouTube",
  "TV Ad",
  "Cold Call",
] as const;

export const SYSTEM_ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN:       "admin",
  OPERATIONS:  "operations",
  MARKETING:   "marketing",
  FINANCE:     "finance",
  HR:          "hr",
  SALES:       "sales",
  SUPPORT:     "support",
} as const;

export const SYSTEM_ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin:       "Admin",
  operations:  "Operations",
  marketing:   "Marketing",
  finance:     "Finance",
  hr:          "HR",
  sales:       "Sales",
  support:     "Support",
};

export const TEAM_ROLE_LABELS: Record<string, string> = {
  founder:            "Founder",
  ceo:                "CEO",
  co_founder:         "Co-Founder",
  director:           "Director",
  admin:              "Admin",
  branch_manager:     "Branch Manager",
  team_lead:          "Team Lead",
  senior_manager:     "Senior Manager",
  sales_manager:      "Sales Manager",
  operations_manager: "Operations Manager",
  finance_manager:    "Finance Manager",
  marketing_manager:  "Marketing Manager",
  agent:              "Agent",
};

// Reference number formats
export const REF_FORMATS = {
  BOOKING:   "WGO",
  INVOICE:   "INV",
  QUOTATION: "QT",
  LEAD:      "LD",
  CUSTOMER:  "CUS",
  PAYMENT:   "PAY",
  EMPLOYEE:  "EMP",
  JOB:       "JOB",
  CANDIDATE: "CAND",
  GOAL:      "GOAL",
  REVIEW:    "REV",
  TRAINING:  "TRN",
  TICKET:    "TKT",
  PACKAGE:   "PKG",
  SUPPLIER:  "SUP",
  ITINERARY: "ITN",
  CAMPAIGN:  "CAM",
  EXPENSE:   "EXP",
} as const;

// Recruitment pipeline stages, in order
export const RECRUITMENT_STAGES = {
  APPLIED:        "applied",
  SCREENING:      "screening",
  INTERVIEW_R1:   "interview_r1",
  INTERVIEW_R2:   "interview_r2",
  HR_ROUND:       "hr_round",
  OFFER_SENT:     "offer_sent",
  JOINED:         "joined",
  REJECTED:       "rejected",
} as const;

export type RecruitmentStage = (typeof RECRUITMENT_STAGES)[keyof typeof RECRUITMENT_STAGES];

export const RECRUITMENT_STAGE_LABELS: Record<RecruitmentStage, string> = {
  applied:      "Applied",
  screening:    "Screening",
  interview_r1: "Interview Round 1",
  interview_r2: "Interview Round 2",
  hr_round:     "HR Round",
  offer_sent:   "Offer Sent",
  joined:       "Joined",
  rejected:     "Rejected",
};

// Performance review rating scale
export const RATING_SCALE = {
  OUTSTANDING:         "outstanding",
  EXCEEDS_EXPECTATIONS: "exceeds_expectations",
  MEETS_EXPECTATIONS:   "meets_expectations",
  NEEDS_IMPROVEMENT:    "needs_improvement",
} as const;

export type Rating = (typeof RATING_SCALE)[keyof typeof RATING_SCALE];

export const RATING_LABELS: Record<Rating, string> = {
  outstanding:          "Outstanding",
  exceeds_expectations: "Exceeds Expectations",
  meets_expectations:   "Meets Expectations",
  needs_improvement:    "Needs Improvement",
};

export const GOAL_STATUS = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  AT_RISK:     "at_risk",
  COMPLETED:   "completed",
} as const;

export type GoalStatus = (typeof GOAL_STATUS)[keyof typeof GOAL_STATUS];

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  at_risk:     "At Risk",
  completed:   "Completed",
};

// Training & Development
export const TRAINING_MODE_LABELS: Record<string, string> = {
  online:  "Online",
  offline: "Offline",
  hybrid:  "Hybrid",
};

export const TRAINING_STATUS_LABELS: Record<string, string> = {
  upcoming:  "Upcoming",
  ongoing:   "Ongoing",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  enrolled:    "Enrolled",
  in_progress: "In Progress",
  completed:   "Completed",
  dropped:     "Dropped",
};
