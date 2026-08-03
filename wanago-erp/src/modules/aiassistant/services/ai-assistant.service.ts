import { auth } from "@/lib/firebase/client";
import { createLead } from "@/modules/leads/services/lead.service";
import { createQuotation } from "@/modules/quotations/services/quotation.service";
import { createBooking, approveBookingAsFinance, approveBookingAsOperations } from "@/modules/bookings/services/booking.service";
import { createInvoice } from "@/modules/invoices/services/invoice.service";
import { createPayment } from "@/modules/payments/services/payment.service";
import { approveLeaveRequest, rejectLeaveRequest } from "@/modules/hrms/leaves/services/leave.service";
import { updateEmployee } from "@/modules/hrms/employees/services/employee.service";
import { createCustomer, updateCustomer } from "@/modules/customers/services/customer.service";
import { createItinerary } from "@/modules/itineraries/services/itinerary.service";
import type { LeadFormData } from "@/modules/leads/types";
import type { QuotationFormData } from "@/modules/quotations/types";
import type { BookingFormData } from "@/modules/bookings/types";
import type { InvoiceFormData } from "@/modules/invoices/types";
import type { PaymentFormData } from "@/modules/payments/types";
import type { EmployeeFormData } from "@/modules/hrms/employees/types";
import type { CustomerFormData } from "@/modules/customers/types";
import type { ItineraryFormData } from "@/modules/itineraries/types";
import type { AILanguage } from "@/lib/ai/getAIAnswer";

export type AssistantTurn = { role: "user" | "assistant"; content: string };

export type AskAssistantResult =
  | { kind: "answer"; text: string }
  | { kind: "proposal"; tool: string; args: unknown; summary: string }
  | { kind: "error"; message: string };

// The unified assistant endpoint requires a verified caller (it can trigger
// write-tool proposals), so every request carries the current Firebase ID
// token — unlike the old help-only/HR-only routes, which had no server
// identity check at all.
export async function askAssistant(question: string, history: AssistantTurn[], language: AILanguage = "en"): Promise<AskAssistantResult> {
  const idToken = await auth.currentUser?.getIdToken().catch(() => null);
  if (!idToken) return { kind: "error", message: "Please sign in to use the assistant." };

  try {
    const res = await fetch("/api/ai-assistant", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ question, history, language }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) return { kind: "error", message: data.error || "Something went wrong." };
    if (data.kind === "answer" && typeof data.text === "string") return { kind: "answer", text: data.text };
    if (data.kind === "proposal" && typeof data.tool === "string") {
      return { kind: "proposal", tool: data.tool, args: data.args, summary: data.summary };
    }
    return { kind: "error", message: "Got an unexpected response from the assistant." };
  } catch {
    return { kind: "error", message: "Couldn't reach the assistant. Check your connection." };
  }
}

export type ConfirmActionResult = { ok: true; docId: string } | { ok: false; error: string };

// Executes an AI-proposed write via the exact same service functions the
// manual forms use, preserving identical firestore.rules authorization and
// business logic (ref-number generation, GST math, approval transactions,
// leave entitlement checks, notifications) — the AI (Python or TS) only
// ever proposes; this dispatch table is the one place a proposal turns into
// a real write, always under the confirming user's own Firebase session.
// autoSend is always forced false for AI-created quotations — no
// customer-facing side effect from an AI action. Logs the outcome
// (best-effort) for audit.
export async function confirmProposedAction(tool: string, args: unknown, summary: string): Promise<ConfirmActionResult> {
  const uid = auth.currentUser?.uid;
  if (!uid) return { ok: false, error: "Please sign in to confirm this action." };

  let resultCollection: string | null = null;
  let resultDocId: string | null = null;
  let outcome: "success" | "error" = "success";
  let errorMessage: string | undefined;

  try {
    switch (tool) {
      case "createLead": {
        const lead = await createLead(args as LeadFormData, uid);
        resultCollection = "leads";
        resultDocId = lead.id;
        break;
      }
      case "createQuotation": {
        const quotation = await createQuotation(args as QuotationFormData, uid, { autoSend: false });
        resultCollection = "quotations";
        resultDocId = quotation.id;
        break;
      }
      case "createBooking": {
        const booking = await createBooking(args as BookingFormData, uid);
        resultCollection = "bookings";
        resultDocId = booking.id;
        break;
      }
      case "approveBookingFinance": {
        const { bookingId, paymentVerification } = args as { bookingId: string; paymentVerification?: "full" | "partial" };
        await approveBookingAsFinance(bookingId, uid, paymentVerification ?? "full");
        resultCollection = "bookings";
        resultDocId = bookingId;
        break;
      }
      case "approveBookingOperations": {
        const { bookingId, profitAmount } = args as { bookingId: string; profitAmount: number };
        await approveBookingAsOperations(bookingId, uid, profitAmount);
        resultCollection = "bookings";
        resultDocId = bookingId;
        break;
      }
      case "createInvoice": {
        const invoice = await createInvoice(args as InvoiceFormData, uid);
        resultCollection = "invoices";
        resultDocId = invoice.id;
        break;
      }
      case "recordPayment": {
        const payment = await createPayment(args as PaymentFormData, uid);
        resultCollection = "payments";
        resultDocId = payment.id;
        break;
      }
      case "approveLeaveRequest": {
        const { leaveRequestId, comments } = args as { leaveRequestId: string; comments?: string };
        await approveLeaveRequest(leaveRequestId, uid, { comments: comments ?? "" });
        resultCollection = "hrmsLeaves";
        resultDocId = leaveRequestId;
        break;
      }
      case "rejectLeaveRequest": {
        const { leaveRequestId, comments } = args as { leaveRequestId: string; comments?: string };
        await rejectLeaveRequest(leaveRequestId, uid, { comments: comments ?? "" });
        resultCollection = "hrmsLeaves";
        resultDocId = leaveRequestId;
        break;
      }
      case "updateEmployeeRecord": {
        const { employeeId, ...patch } = args as { employeeId: string } & Partial<EmployeeFormData>;
        await updateEmployee(employeeId, patch);
        resultCollection = "hrmsEmployees";
        resultDocId = employeeId;
        break;
      }
      case "createCustomer": {
        const customer = await createCustomer(args as CustomerFormData, uid);
        resultCollection = "customers";
        resultDocId = customer.id;
        break;
      }
      case "updateCustomer": {
        const { customerId, ...patch } = args as { customerId: string } & Partial<CustomerFormData>;
        await updateCustomer(customerId, patch);
        resultCollection = "customers";
        resultDocId = customerId;
        break;
      }
      case "createItinerary": {
        const raw = args as ItineraryFormData;
        const itinerary = await createItinerary({
          ...raw,
          tripType: raw.tripType ?? null, packageId: null, packageName: null,
          tagline: raw.tagline ?? null, inclusions: raw.inclusions ?? [], exclusions: raw.exclusions ?? [],
          notes: raw.notes ?? null, itineraryStatus: "draft",
        }, uid);
        resultCollection = "itineraries";
        resultDocId = itinerary.id;
        break;
      }
      default:
        throw new Error(`Unknown action tool: ${tool}`);
    }
  } catch (err) {
    outcome = "error";
    errorMessage = err instanceof Error ? err.message : "Unknown error";
  }

  const idToken = await auth.currentUser?.getIdToken().catch(() => null);
  if (idToken) {
    fetch("/api/ai-assistant/log-action", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ tool, argsSummary: summary, resultCollection, resultDocId, outcome, errorMessage }),
    }).catch(() => {});
  }

  if (outcome === "error") return { ok: false, error: errorMessage ?? "Failed to create the record." };
  return { ok: true, docId: resultDocId! };
}

export type TranscribeResult = { text: string } | { error: string };

// Uses Groq's Whisper — when language is Malayalam, hits the *translation*
// endpoint so the returned text is already in English; for English it just
// transcribes normally.
export async function transcribeAudio(blob: Blob, language: "en" | "ml"): Promise<TranscribeResult> {
  try {
    const form = new FormData();
    form.set("file", blob, "recording.webm");
    form.set("language", language);

    const res = await fetch("/api/ai-assistant/transcribe", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) return { error: data.error || "Voice input isn't available right now." };
    if (typeof data.text !== "string" || !data.text) return { error: "Couldn't hear anything — please try again." };
    return { text: data.text };
  } catch {
    return { error: "Voice input is temporarily unavailable." };
  }
}
