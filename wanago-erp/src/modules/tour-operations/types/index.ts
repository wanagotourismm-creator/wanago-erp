import type { FirestoreRecord } from "@/types/global";
import type { OperationsStage } from "@/lib/constants";

// Reused by every vendor payment section (hotel, meals, transport by mode,
// sightseeing vehicle, entry tickets). balancePayment is always recomputed
// server-side as totalCost - bookingPayment (see tour-operations.service.ts)
// — never trusted from client input, same convention as Booking.balanceAmount.
export type PaymentBreakdown = {
  totalCost:      number;
  bookingPayment: number;
  balancePayment: number;
};

export const emptyPayment = (): PaymentBreakdown => ({ totalCost: 0, bookingPayment: 0, balancePayment: 0 });

export type DoneOrPending = "done" | "pending";
export type BookedOrPending = "booked" | "pending";
export type SentOrPending = "sent" | "pending";
export type YesNo = "yes" | "no";

export type TravelType = "family" | "bachelors" | "corporate" | "students" | "mixed";
export type PackageCategory = "budget" | "2_star" | "3_star" | "4_star" | "5_star" | "other";
export type TransportMode = "flight" | "train" | "bus" | "other";
export type RoomSharing = "double" | "triple" | "quad" | "other";

// ── Module 1 — Sales → Operations Handover ──────────────────────
export type OperationsHandover = {
  // Prefilled from the linked Booking at creation (see
  // emptyOperationsBooking in tour-operations.service.ts) and editable here
  // — this is what the list view, dashboard stats, and cron reminders key
  // off to know when a trip is happening without opening the record.
  travelDate:        string | null;
  returnDate:        string | null;
  travelDateRemarks: string;
  place:             string;
  adultAges:         number[];
  childAges:         number[];
  idCardUrls:        string[];

  travelType:        TravelType | "";

  packageCategory:      PackageCategory | "";
  packageCategoryOther: string;

  arrivalDeparture: { mode: TransportMode | ""; modeOther: string; seatClass: string; remarks: string };
  sightseeingVehicle: { vehicleType: string; remarks: string };

  hotelPref: {
    category:         string;
    numberOfRooms:    number;
    roomSharing:      RoomSharing | "";
    roomSharingOther: string;
    extraRequirements: string;
  };

  entryTicketsPref: { included: boolean; remarks: string };
  activities:       string;
  guideIncluded:    boolean;

  packageCost: { netRate: number; sellingRate: number };

  overallRemarks: string;
};

// ── Module 2 — Operations Booking ───────────────────────────────
export type OperationsVerification = {
  customerVerification: DoneOrPending;
  packageVerification:  DoneOrPending;
};

export type HotelBooking = {
  numberOfNights: number;
  stayLocations:  string;
  status:         BookedOrPending;
  payment:        PaymentBreakdown;
  remarks:        string;
  allCompleted:   boolean;
};

export type MealsBooking = {
  arrangement: "hotel" | "outside" | "";
  status:      BookedOrPending;
  payment:     PaymentBreakdown;
  remarks:     string;
};

export type TransportArrivalDeparture = {
  mode:            TransportMode | "";
  status:          BookedOrPending;
  paymentByMode:   { flight: PaymentBreakdown; train: PaymentBreakdown; bus: PaymentBreakdown; other: PaymentBreakdown };
  remarks:         string;
  allCompleted:    boolean;
};

export type TransportSightseeing = {
  vehicleCategory: string;
  status:          BookedOrPending;
  payment:         PaymentBreakdown;
  remarks:         string;
  allCompleted:    boolean;
};

export type EntryTicketsBooking = {
  included:      boolean;
  ticketDetails: string;
  payment:       PaymentBreakdown;
  remarks:       string;
};

export type GuideBooking = {
  included:           boolean;
  name:                string;
  contact:             string;
  confirmationStatus:  "confirmed" | "pending" | "";
};

export type FinalBookingStatus = {
  allCompleted: boolean;
  remarks:      string;
};

// ── Module 3 — Pre-Departure Operations ─────────────────────────
export type PreDeparture = {
  reconfirmBookings: { status: DoneOrPending | "completed"; remarks: string };
  whatsappGroup: {
    checklist: {
      groupCreated:          boolean;
      tourPlanExplained:     boolean;
      guestDoubtsCleared:    boolean;
      tourManagerIntroduced: boolean;
      guideIntroduced:       boolean;
    };
    status:  "completed" | "pending";
    remarks: string;
  };
  guideBriefing: {
    checklist: {
      packageInstructionsExplained: boolean;
      dayWiseTourPlanExplained:     boolean;
      coordinatorSopExplained:      boolean;
    };
    status:  "completed" | "pending";
    remarks: string;
  };
  welcomeBoard: { status: "completed" | "pending"; remarks: string };
};

// ── Module 4 — On-Tour Operations (append-only logs) ────────────
export type DailyPlanningMessage = { id: string; date: string; status: SentOrPending; remarks: string };
export type DailyCoordinatorReport = { id: string; date: string; status: "received" | "pending"; remarks: string };
export type OperationsIssue = { id: string; description: string; status: "resolved" | "pending"; remarks: string; raisedAt: string };
export type DailyMonitoringEntry = { id: string; date: string; update: string };

export type OnTour = {
  dailyPlanningMessages:   DailyPlanningMessage[];
  dailyCoordinatorReports: DailyCoordinatorReport[];
  issues:                  OperationsIssue[];
  dailyMonitoring:         DailyMonitoringEntry[];
};

// ── Module 5 — Package Closure ───────────────────────────────────
export type Closure = {
  customerReachedHome:    { status: YesNo | ""; remarks: string };
  feedback:               { status: "collected" | "pending"; notes: string; voiceFeedbackUrl: string };
  testimonialVideo:       { status: "collected" | "pending"; videoUrl: string };
  whatsappClosingMessage: { status: SentOrPending; remarks: string };
  vendorPaymentClearance: { status: "completed" | "pending"; remarks: string };
};

// ── Root document ─────────────────────────────────────────────
export type OperationsBooking = Omit<FirestoreRecord, "status"> & {
  bookingId:     string;
  refNumber:     string;
  customerName:  string;
  destination:   string;

  handover:            OperationsHandover;
  verification:        OperationsVerification;
  hotelBooking:         HotelBooking;
  meals:                MealsBooking;
  transportArrival:     TransportArrivalDeparture;
  transportSightseeing: TransportSightseeing;
  entryTicketsBooking:  EntryTicketsBooking;
  guide:                GuideBooking;
  finalBookingStatus:   FinalBookingStatus;
  preDeparture:         PreDeparture;
  onTour:               OnTour;
  closure:              Closure;

  status:         OperationsStage;
  overallRemarks: string;
};
