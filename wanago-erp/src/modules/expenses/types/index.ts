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
};

export type ExpenseFormData = Omit<Expense, "id" | "createdAt" | "updatedAt" | "status" | "refNumber" | "receiptUrl">;
