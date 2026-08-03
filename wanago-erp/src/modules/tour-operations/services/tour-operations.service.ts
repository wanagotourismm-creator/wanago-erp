import { doc, updateDoc, arrayUnion, serverTimestamp, where, type QueryConstraint } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS, OPERATIONS_STAGE } from "@/lib/constants";
import { toDate } from "@/lib/utils/helpers";
import { tourOperationsRepository } from "@/modules/tour-operations/services/tour-operations.repository";
import type { Booking } from "@/modules/bookings/types";
import type {
  OperationsBooking, OperationsHandover, OperationsVerification, HotelBooking, MealsBooking,
  TransportArrivalDeparture, TransportSightseeing, EntryTicketsBooking, GuideBooking,
  FinalBookingStatus, PreDeparture, Closure, PaymentBreakdown,
  DailyPlanningMessage, DailyCoordinatorReport, OperationsIssue, DailyMonitoringEntry,
} from "@/modules/tour-operations/types";

// ── Defaults ─────────────────────────────────────────────────────

const emptyPayment = (): PaymentBreakdown => ({ totalCost: 0, bookingPayment: 0, balancePayment: 0 });

function emptyHandover(booking: Booking): OperationsHandover {
  return {
    travelDateRemarks: "",
    place: "",
    adultAges: [],
    childAges: [],
    idCardUrls: [],
    travelType: "",
    packageCategory: "",
    packageCategoryOther: "",
    arrivalDeparture: { mode: "", modeOther: "", seatClass: "", remarks: "" },
    sightseeingVehicle: { vehicleType: "", remarks: "" },
    hotelPref: { category: "", numberOfRooms: 0, roomSharing: "", roomSharingOther: "", extraRequirements: "" },
    entryTicketsPref: { included: false, remarks: "" },
    activities: "",
    guideIncluded: false,
    packageCost: { netRate: 0, sellingRate: booking.totalAmount },
    overallRemarks: booking.notes ?? "",
  };
}

function emptyOperationsBooking(booking: Booking, createdBy: string): Omit<OperationsBooking, "id" | "createdAt" | "updatedAt"> {
  return {
    bookingId:    booking.id,
    refNumber:    booking.refNumber,
    customerName: booking.customerName,
    destination:  booking.destination,
    createdBy,

    handover: emptyHandover(booking),

    verification: { customerVerification: "pending", packageVerification: "pending" },

    hotelBooking: { numberOfNights: 0, stayLocations: "", status: "pending", payment: emptyPayment(), remarks: "", allCompleted: false },

    meals: { arrangement: "", status: "pending", payment: emptyPayment(), remarks: "" },

    transportArrival: {
      mode: "", status: "pending",
      paymentByMode: { flight: emptyPayment(), train: emptyPayment(), bus: emptyPayment(), other: emptyPayment() },
      remarks: "", allCompleted: false,
    },

    transportSightseeing: { vehicleCategory: "", status: "pending", payment: emptyPayment(), remarks: "", allCompleted: false },

    entryTicketsBooking: { included: false, ticketDetails: "", payment: emptyPayment(), remarks: "" },

    guide: { included: false, name: "", contact: "", confirmationStatus: "" },

    finalBookingStatus: { allCompleted: false, remarks: "" },

    preDeparture: {
      reconfirmBookings: { status: "pending", remarks: "" },
      whatsappGroup: {
        checklist: { groupCreated: false, tourPlanExplained: false, guestDoubtsCleared: false, tourManagerIntroduced: false, guideIntroduced: false },
        status: "pending", remarks: "",
      },
      guideBriefing: {
        checklist: { packageInstructionsExplained: false, dayWiseTourPlanExplained: false, coordinatorSopExplained: false },
        status: "pending", remarks: "",
      },
      welcomeBoard: { status: "pending", remarks: "" },
    },

    onTour: { dailyPlanningMessages: [], dailyCoordinatorReports: [], issues: [], dailyMonitoring: [] },

    closure: {
      customerReachedHome: { status: "", remarks: "" },
      feedback: { status: "pending", notes: "", voiceFeedbackUrl: "" },
      testimonialVideo: { status: "pending", videoUrl: "" },
      whatsappClosingMessage: { status: "pending", remarks: "" },
      vendorPaymentClearance: { status: "pending", remarks: "" },
    },

    status: OPERATIONS_STAGE.BOOKING_RECEIVED,
    overallRemarks: "",
  };
}

// Derives the overall stage purely from sub-section state — there is no
// manual status dropdown, so it's always in sync with what's actually been
// done (and can move backward if e.g. a completed section is corrected back
// to pending, which is desirable here since the record is live-edited by
// several people over the trip's lifetime).
export function computeStage(d: OperationsBooking): OperationsBooking["status"] {
  const verificationDone = d.verification.customerVerification === "done" && d.verification.packageVerification === "done";
  const bookingsDone = d.finalBookingStatus.allCompleted;
  const preDepDone =
    d.preDeparture.reconfirmBookings.status === "completed" &&
    d.preDeparture.whatsappGroup.status === "completed" &&
    (!d.guide.included || d.preDeparture.guideBriefing.status === "completed") &&
    d.preDeparture.welcomeBoard.status === "completed";
  const tourStarted = d.onTour.dailyPlanningMessages.length > 0 || d.onTour.dailyMonitoring.length > 0;
  const customerHome = d.closure.customerReachedHome.status === "yes";
  const closureDone =
    customerHome &&
    d.closure.feedback.status === "collected" &&
    d.closure.testimonialVideo.status === "collected" &&
    d.closure.whatsappClosingMessage.status === "sent" &&
    d.closure.vendorPaymentClearance.status === "completed";

  if (closureDone) return OPERATIONS_STAGE.PACKAGE_CLOSED;
  if (customerHome) return OPERATIONS_STAGE.TOUR_COMPLETED;
  if (preDepDone && tourStarted) return OPERATIONS_STAGE.TOUR_ONGOING;
  if (preDepDone) return OPERATIONS_STAGE.PRE_DEPARTURE_COMPLETED;
  if (bookingsDone) return OPERATIONS_STAGE.BOOKINGS_COMPLETED;
  if (verificationDone) return OPERATIONS_STAGE.BOOKING_VERIFICATION_COMPLETED;
  return OPERATIONS_STAGE.BOOKING_RECEIVED;
}

function withBalance(p: PaymentBreakdown): PaymentBreakdown {
  return { ...p, balancePayment: p.totalCost - p.bookingPayment };
}

// ── Reads ────────────────────────────────────────────────────────

export async function fetchOperationsBookings(filters?: { status?: string }): Promise<OperationsBooking[]> {
  const constraints: QueryConstraint[] = [];
  if (filters?.status) constraints.push(where("status", "==", filters.status));
  const rows = await tourOperationsRepository.findMany({ constraints });
  return rows.sort((a, b) => (toDate(b.updatedAt)?.getTime() ?? 0) - (toDate(a.updatedAt)?.getTime() ?? 0));
}

export async function fetchOperationsBookingById(id: string): Promise<OperationsBooking | null> {
  return tourOperationsRepository.findById(id);
}

export async function fetchOperationsBookingByBookingId(bookingId: string): Promise<OperationsBooking | null> {
  const rows = await tourOperationsRepository.findMany({ constraints: [where("bookingId", "==", bookingId)] });
  return rows[0] ?? null;
}

// Idempotent — the entry point from a confirmed Booking calls this every
// time "Open Tour Operations" is clicked; only the first call actually
// creates a document.
export async function getOrCreateOperationsBooking(booking: Booking, createdBy: string): Promise<OperationsBooking> {
  const existing = await fetchOperationsBookingByBookingId(booking.id);
  if (existing) return existing;
  return tourOperationsRepository.create(emptyOperationsBooking(booking, createdBy));
}

// ── Section updates (each tab saves its own section in full) ────

async function saveSection<K extends keyof OperationsBooking>(
  id: string,
  key: K,
  value: OperationsBooking[K]
): Promise<OperationsBooking> {
  const existing = await tourOperationsRepository.findById(id);
  if (!existing) throw new Error("Operations record not found.");
  const merged = { ...existing, [key]: value } as OperationsBooking;
  const status = computeStage(merged);
  await tourOperationsRepository.update(id, { [key]: value, status } as Partial<OperationsBooking>);
  return { ...merged, status };
}

export function updateHandover(id: string, value: OperationsHandover) {
  return saveSection(id, "handover", value);
}

export function updateVerification(id: string, value: OperationsVerification) {
  return saveSection(id, "verification", value);
}

export function updateHotelBooking(id: string, value: HotelBooking) {
  return saveSection(id, "hotelBooking", { ...value, payment: withBalance(value.payment) });
}

export function updateMeals(id: string, value: MealsBooking) {
  return saveSection(id, "meals", { ...value, payment: withBalance(value.payment) });
}

export function updateTransportArrival(id: string, value: TransportArrivalDeparture) {
  return saveSection(id, "transportArrival", {
    ...value,
    paymentByMode: {
      flight: withBalance(value.paymentByMode.flight),
      train:  withBalance(value.paymentByMode.train),
      bus:    withBalance(value.paymentByMode.bus),
      other:  withBalance(value.paymentByMode.other),
    },
  });
}

export function updateTransportSightseeing(id: string, value: TransportSightseeing) {
  return saveSection(id, "transportSightseeing", { ...value, payment: withBalance(value.payment) });
}

export function updateEntryTickets(id: string, value: EntryTicketsBooking) {
  return saveSection(id, "entryTicketsBooking", { ...value, payment: withBalance(value.payment) });
}

export function updateGuide(id: string, value: GuideBooking) {
  return saveSection(id, "guide", value);
}

export function updateFinalBookingStatus(id: string, value: FinalBookingStatus) {
  return saveSection(id, "finalBookingStatus", value);
}

export function updatePreDeparture(id: string, value: PreDeparture) {
  return saveSection(id, "preDeparture", value);
}

export function updateClosure(id: string, value: Closure) {
  return saveSection(id, "closure", value);
}

export function updateOverallRemarks(id: string, value: string) {
  return saveSection(id, "overallRemarks", value);
}

// ── Module 4 — On-Tour append-only logs ──────────────────────────
// arrayUnion avoids the read-modify-write race of two people logging an
// entry at the same moment (same reasoning as booking.service.ts's
// transitionBookingStatus, applied to arrays instead of a status field).

async function appendOnTour(id: string, field: keyof OperationsBooking["onTour"], entry: unknown): Promise<OperationsBooking> {
  const ref = doc(db, FIRESTORE_COLLECTIONS.OPERATIONS_BOOKINGS, id);
  await updateDoc(ref, { [`onTour.${field}`]: arrayUnion(entry), updatedAt: serverTimestamp() });
  const existing = await tourOperationsRepository.findById(id);
  if (!existing) throw new Error("Operations record not found.");
  // Re-derive status: starting the daily log can flip the stage to
  // "tour_ongoing" once pre-departure is already done.
  const status = computeStage(existing);
  if (status !== existing.status) await tourOperationsRepository.update(id, { status });
  return { ...existing, status };
}

export function addDailyPlanningMessage(id: string, entry: Omit<DailyPlanningMessage, "id">) {
  return appendOnTour(id, "dailyPlanningMessages", { ...entry, id: crypto.randomUUID() });
}

export function addDailyCoordinatorReport(id: string, entry: Omit<DailyCoordinatorReport, "id">) {
  return appendOnTour(id, "dailyCoordinatorReports", { ...entry, id: crypto.randomUUID() });
}

export function addIssue(id: string, entry: Omit<OperationsIssue, "id" | "status">) {
  return appendOnTour(id, "issues", { ...entry, id: crypto.randomUUID(), status: "pending" as const });
}

export function addDailyMonitoringEntry(id: string, entry: Omit<DailyMonitoringEntry, "id">) {
  return appendOnTour(id, "dailyMonitoring", { ...entry, id: crypto.randomUUID() });
}

// Flips one issue to resolved — needs a full read-modify-write (not
// arrayUnion) since it mutates an existing array element rather than
// appending; issues are edited rarely enough that this is fine.
export async function resolveIssue(id: string, issueId: string): Promise<OperationsBooking> {
  const existing = await tourOperationsRepository.findById(id);
  if (!existing) throw new Error("Operations record not found.");
  const issues = existing.onTour.issues.map((i) => (i.id === issueId ? { ...i, status: "resolved" as const } : i));
  return saveSection(id, "onTour", { ...existing.onTour, issues });
}
