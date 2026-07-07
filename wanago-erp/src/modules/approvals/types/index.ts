import type { Booking } from "@/modules/bookings/types";
import type { Quotation } from "@/modules/quotations/types";
import type { Invoice } from "@/modules/invoices/types";

// A single row in the Approvals Inbox. `kind` discriminates which underlying
// record/approval action this row maps onto — the hook/page switch on it to
// call the right approve/reject function and to render the right modal.
export type ApprovalItem =
  | { kind: "booking-finance"; id: string; refNumber: string; customerName: string; agentName: string | null; amount: number; data: Booking }
  | { kind: "booking-ops";     id: string; refNumber: string; customerName: string; agentName: string | null; amount: number; data: Booking }
  | { kind: "quotation";       id: string; refNumber: string; customerName: string; agentName: string | null; amount: number; data: Quotation }
  | { kind: "invoice";         id: string; refNumber: string; customerName: string; agentName: string | null; amount: number; data: Invoice };
