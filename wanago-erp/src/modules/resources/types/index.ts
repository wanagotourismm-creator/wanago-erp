import type { FirestoreRecord } from "@/types/global";

export type ResourceType = "vehicle" | "driver" | "guide" | "room_block";

export type Resource = FirestoreRecord & {
  name:     string;
  type:     ResourceType;
  capacity: number;
  officeId:   string;
  officeName: string;
  // Optional loose link to the vendor company this resource belongs to
  // (e.g. the transport supplier that owns the vehicle) — not inheritance,
  // Supplier is a vendor directory, this is a schedulable entity.
  supplierId: string | null;
  // Contact number for a driver/guide — shown to the traveler in the
  // Companion portal ("call your driver"). Optional so vehicles/room
  // blocks (which have no personal contact) can leave it unset.
  phone:    string | null;
  notes:    string | null;
  isActive: boolean;
};

export type ResourceFormData = Omit<Resource, "id" | "createdAt" | "updatedAt" | "status" | "createdBy">;

// startDate/endDate are independent of Booking.travelDate/returnDate
// (which are both individually nullable and can change after a booking is
// created) — prefilled from the booking when assigning, but always
// required and editable here so conflict detection always has two real
// dates to compare.
export type ResourceAssignment = FirestoreRecord & {
  resourceId: string; resourceName: string; resourceType: ResourceType;
  bookingId: string; bookingRefNumber: string; customerName: string;
  startDate: string; endDate: string; // YYYY-MM-DD
  notes: string | null;
};

export type ResourceAssignmentFormData = Omit<ResourceAssignment, "id" | "createdAt" | "updatedAt" | "status" | "createdBy">;

export type ResourceBlackout = FirestoreRecord & {
  resourceId: string; resourceName: string;
  startDate: string; endDate: string;
  reason: string;
};

export type ResourceBlackoutFormData = Omit<ResourceBlackout, "id" | "createdAt" | "updatedAt" | "status" | "createdBy">;

export type DateRange = { startDate: string; endDate: string };
