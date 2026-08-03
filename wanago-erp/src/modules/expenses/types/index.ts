import type { FirestoreRecord } from "@/types/global";

export type Expense = FirestoreRecord & {
  category:       string;      // free text, e.g. Travel/Office Supplies/Utilities/Marketing/Other
  amount:         number;
  expenseDate:    string;
  vendor:         string | null;
  description:    string;
  receiptUrl:     string | null;
  officeId:       string;
  officeName:     string;
  notes:          string | null;
  refNumber:      string;
  expenseStatus:  "pending" | "approved" | "paid" | "rejected";
  // Optional link to the specific trip this expense was incurred for (e.g.
  // an extra hotel night, last-minute transport) — same nullable pair
  // naming as Invoice.bookingId/bookingRef. Lets the trip-profitability
  // engine (src/modules/profitability/) factor real trip-specific costs
  // into a booking's computed profit, beyond just Package.costPrice.
  bookingId:      string | null;
  bookingRef:     string | null;

  // Approval trail — set by approveExpense/rejectExpense, not by a plain
  // status edit. null until a decision is made.
  approvedBy:       string | null;
  approvedAt:       unknown | null;
  rejectedBy:       string | null;
  rejectedAt:       unknown | null;
  rejectionReason:  string | null;
};

export type ExpenseFormData = Omit<
  Expense,
  | "id" | "createdAt" | "updatedAt" | "status" | "refNumber" | "receiptUrl"
  | "approvedBy" | "approvedAt" | "rejectedBy" | "rejectedAt" | "rejectionReason"
>;
