"use client";

import { useEffect, useState } from "react";
import { serverTimestamp } from "firebase/firestore";
import { fetchBookings } from "@/modules/bookings/services/booking.service";
import { bookingRepository } from "@/modules/bookings/services/booking.repository";
import { fetchEmployeeById } from "@/modules/hrms/employees/services/employee.service";
import { notifyUser } from "@/lib/notify";
import { TRIP_TYPES, BOOKING_STATUS, WHATSAPP_TEMPLATE_PURPOSES } from "@/lib/constants";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatDate, toDate } from "@/lib/utils/helpers";
import { Bell } from "lucide-react";
import type { Booking } from "@/modules/bookings/types";

type FollowUp = {
  id:           string;
  customerName: string;
  destination:  string;
  travelDate:   string;
  daysLeft:     number;
};

function toFollowUp(b: Booking, daysLeft: number): FollowUp {
  return {
    id:           b.id,
    customerName: b.customerName,
    destination:  b.destination,
    travelDate:   b.travelDate as string,
    daysLeft,
  };
}

export function InternationalFollowUps() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const bookings = await fetchBookings();
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const due: { booking: Booking; daysLeft: number }[] = [];

        for (const b of bookings) {
          if (b.tripType !== TRIP_TYPES.INTERNATIONAL) continue;
          if (!b.travelDate) continue;
          if (b.status === BOOKING_STATUS.COMPLETED || b.status === BOOKING_STATUS.CANCELLED) continue;

          const travel = toDate(b.travelDate);
          if (!travel) continue;
          travel.setHours(0, 0, 0, 0);

          const windowStart = new Date(travel);
          windowStart.setDate(windowStart.getDate() - 10);

          if (now < windowStart || now > travel) continue;

          const daysLeft = Math.round((travel.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          due.push({ booking: b, daysLeft });
        }

        due.sort((a, b) => a.daysLeft - b.daysLeft);
        setFollowUps(due.map(({ booking, daysLeft }) => toFollowUp(booking, daysLeft)));

        // Best-effort: notify each assigned agent once per booking, then stamp
        // followUpNotifiedAt so it never re-fires on a later dashboard load.
        for (const { booking, daysLeft } of due) {
          if (booking.followUpNotifiedAt) continue;
          notifyAssignee(booking, daysLeft).catch(() => {});
        }
      } catch {
        setFollowUps([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>International Follow-Ups</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">Trips departing within 10 days</p>
        </div>
      </CardHeader>

      {loading ? (
        <div className="h-24 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : followUps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Bell size={28} className="text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground font-medium">No follow-ups due</p>
        </div>
      ) : (
        <div className="space-y-2">
          {followUps.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{f.customerName}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{f.destination}</p>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <p className="text-xs font-medium text-foreground">{formatDate(f.travelDate)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {f.daysLeft === 0 ? "Departs today" : `${f.daysLeft} day${f.daysLeft !== 1 ? "s" : ""} left`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// Best-effort: resolves the booking's assigned agent to an employee record
// (mirrors useEss.ts's notifyManagerOfRequest lookup pattern) and notifies
// them in-app + email + WhatsApp, then stamps followUpNotifiedAt so this
// never re-fires for the same booking.
async function notifyAssignee(booking: Booking, daysLeft: number): Promise<void> {
  if (!booking.assignedTo) return;
  const employee = await fetchEmployeeById(booking.assignedTo);
  if (!employee) return;

  const daysText = daysLeft === 0 ? "today" : `in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`;

  await notifyUser({
    userId:   employee.userId ?? null,
    email:    employee.email,
    phone:    employee.mobileNumber,
    whatsappPurpose:   WHATSAPP_TEMPLATE_PURPOSES.INTERNATIONAL_TRIP_FOLLOWUP,
    whatsappVariables: [booking.customerName, booking.destination, daysText],
    title:    "Follow up: international trip departing soon",
    body:     `${booking.customerName}'s trip to ${booking.destination} departs ${daysText} — please follow up.`,
    link:     "/bookings",
    category: "followup",
  });

  await bookingRepository.update(booking.id, { followUpNotifiedAt: serverTimestamp() });
}
