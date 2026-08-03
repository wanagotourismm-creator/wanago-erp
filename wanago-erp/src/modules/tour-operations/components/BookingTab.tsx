"use client";

import { useState } from "react";
import { ClipboardCheck, Hotel, Utensils, Bus, Ticket, UserCog, CheckCircle2 } from "lucide-react";
import { Field, inputClass, SectionCard, PaymentFields } from "@/modules/tour-operations/components/shared";
import type { useTourOperation } from "@/modules/tour-operations/hooks/useTourOperation";
import type {
  OperationsBooking, OperationsVerification, HotelBooking, MealsBooking,
  TransportArrivalDeparture, TransportSightseeing, EntryTicketsBooking, GuideBooking, FinalBookingStatus,
} from "@/modules/tour-operations/types";

type Ops = ReturnType<typeof useTourOperation>;

export function BookingTab({ record, ops }: { record: OperationsBooking; ops: Ops }) {
  return (
    <div className="space-y-5">
      <VerificationCard value={record.verification} onSave={ops.saveVerification} />
      <HotelCard value={record.hotelBooking} onSave={ops.saveHotelBooking} />
      <MealsCard value={record.meals} onSave={ops.saveMeals} />
      <TransportArrivalCard value={record.transportArrival} onSave={ops.saveTransportArrival} />
      <TransportSightseeingCard value={record.transportSightseeing} onSave={ops.saveTransportSightseeing} />
      <EntryTicketsCard value={record.entryTicketsBooking} onSave={ops.saveEntryTickets} />
      <GuideCard value={record.guide} onSave={ops.saveGuide} />
      <FinalStatusCard value={record.finalBookingStatus} onSave={ops.saveFinalBookingStatus} />
    </div>
  );
}

function VerificationCard({ value, onSave }: { value: OperationsVerification; onSave: Ops["saveVerification"] }) {
  const [local, setLocal] = useState(value);
  return (
    <SectionCard title="Verification" icon={<ClipboardCheck size={14} className="text-primary" />} onSave={() => onSave(local)}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Customer Verification">
          <select className={inputClass} value={local.customerVerification} onChange={(e) => setLocal({ ...local, customerVerification: e.target.value as OperationsVerification["customerVerification"] })}>
            <option value="pending">Pending</option>
            <option value="done">Done</option>
          </select>
        </Field>
        <Field label="Package Verification">
          <select className={inputClass} value={local.packageVerification} onChange={(e) => setLocal({ ...local, packageVerification: e.target.value as OperationsVerification["packageVerification"] })}>
            <option value="pending">Pending</option>
            <option value="done">Done</option>
          </select>
        </Field>
      </div>
    </SectionCard>
  );
}

function HotelCard({ value, onSave }: { value: HotelBooking; onSave: Ops["saveHotelBooking"] }) {
  const [local, setLocal] = useState(value);
  return (
    <SectionCard title="Hotel Booking" icon={<Hotel size={14} className="text-primary" />} onSave={() => onSave(local)}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Number of Nights">
          <input type="number" min={0} className={inputClass} value={local.numberOfNights} onChange={(e) => setLocal({ ...local, numberOfNights: Number(e.target.value) })} />
        </Field>
        <Field label="Stay Location(s)" className="sm:col-span-2">
          <input className={inputClass} value={local.stayLocations} onChange={(e) => setLocal({ ...local, stayLocations: e.target.value })} />
        </Field>
        <Field label="Booking Status">
          <select className={inputClass} value={local.status} onChange={(e) => setLocal({ ...local, status: e.target.value as HotelBooking["status"] })}>
            <option value="pending">Pending</option>
            <option value="booked">Booked</option>
          </select>
        </Field>
        <Field label="All Hotel Bookings Completed">
          <select className={inputClass} value={local.allCompleted ? "yes" : "no"} onChange={(e) => setLocal({ ...local, allCompleted: e.target.value === "yes" })}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </Field>
      </div>
      <PaymentFields value={local.payment} onChange={(payment) => setLocal({ ...local, payment })} />
      <Field label="Remarks">
        <textarea rows={2} className={inputClass} value={local.remarks} onChange={(e) => setLocal({ ...local, remarks: e.target.value })} />
      </Field>
    </SectionCard>
  );
}

function MealsCard({ value, onSave }: { value: MealsBooking; onSave: Ops["saveMeals"] }) {
  const [local, setLocal] = useState(value);
  return (
    <SectionCard title="Meals" icon={<Utensils size={14} className="text-primary" />} onSave={() => onSave(local)}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Meal Arrangement">
          <select className={inputClass} value={local.arrangement} onChange={(e) => setLocal({ ...local, arrangement: e.target.value as MealsBooking["arrangement"] })}>
            <option value="">Select</option>
            <option value="hotel">Hotel</option>
            <option value="outside">Outside</option>
          </select>
        </Field>
        <Field label="Booking Status">
          <select className={inputClass} value={local.status} onChange={(e) => setLocal({ ...local, status: e.target.value as MealsBooking["status"] })}>
            <option value="pending">Pending</option>
            <option value="booked">Booked</option>
          </select>
        </Field>
      </div>
      <PaymentFields value={local.payment} onChange={(payment) => setLocal({ ...local, payment })} />
      <Field label="Remarks (e.g. Breakfast & Dinner at Hotel, Lunch Outside)">
        <textarea rows={2} className={inputClass} value={local.remarks} onChange={(e) => setLocal({ ...local, remarks: e.target.value })} />
      </Field>
    </SectionCard>
  );
}

function TransportArrivalCard({ value, onSave }: { value: TransportArrivalDeparture; onSave: Ops["saveTransportArrival"] }) {
  const [local, setLocal] = useState(value);
  const modes: { key: keyof TransportArrivalDeparture["paymentByMode"]; label: string }[] = [
    { key: "flight", label: "Flight" }, { key: "train", label: "Train" }, { key: "bus", label: "Bus" }, { key: "other", label: "Other" },
  ];
  return (
    <SectionCard title="Transportation Booking — Arrival & Departure" icon={<Bus size={14} className="text-primary" />} onSave={() => onSave(local)}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Mode">
          <select className={inputClass} value={local.mode} onChange={(e) => setLocal({ ...local, mode: e.target.value as TransportArrivalDeparture["mode"] })}>
            <option value="">Select mode</option>
            <option value="flight">Flight</option>
            <option value="train">Train</option>
            <option value="bus">Bus</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Booking Status">
          <select className={inputClass} value={local.status} onChange={(e) => setLocal({ ...local, status: e.target.value as TransportArrivalDeparture["status"] })}>
            <option value="pending">Pending</option>
            <option value="booked">Booked</option>
          </select>
        </Field>
        <Field label="All Arrival & Departure Bookings Completed">
          <select className={inputClass} value={local.allCompleted ? "yes" : "no"} onChange={(e) => setLocal({ ...local, allCompleted: e.target.value === "yes" })}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </Field>
      </div>
      <div className="space-y-3">
        {modes.map((m) => (
          <div key={m.key} className="rounded-xl border border-border/70 p-3">
            <p className="mb-2 text-[11px] font-semibold text-muted-foreground">{m.label} Payment</p>
            <PaymentFields
              value={local.paymentByMode[m.key]}
              onChange={(payment) => setLocal({ ...local, paymentByMode: { ...local.paymentByMode, [m.key]: payment } })}
            />
          </div>
        ))}
      </div>
      <Field label="Remarks">
        <textarea rows={2} className={inputClass} value={local.remarks} onChange={(e) => setLocal({ ...local, remarks: e.target.value })} />
      </Field>
    </SectionCard>
  );
}

function TransportSightseeingCard({ value, onSave }: { value: TransportSightseeing; onSave: Ops["saveTransportSightseeing"] }) {
  const [local, setLocal] = useState(value);
  return (
    <SectionCard title="Sightseeing Vehicle" icon={<Bus size={14} className="text-primary" />} onSave={() => onSave(local)}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Vehicle Category">
          <input className={inputClass} value={local.vehicleCategory} onChange={(e) => setLocal({ ...local, vehicleCategory: e.target.value })} />
        </Field>
        <Field label="Booking Status">
          <select className={inputClass} value={local.status} onChange={(e) => setLocal({ ...local, status: e.target.value as TransportSightseeing["status"] })}>
            <option value="pending">Pending</option>
            <option value="booked">Booked</option>
          </select>
        </Field>
      </div>
      <PaymentFields value={local.payment} onChange={(payment) => setLocal({ ...local, payment })} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Remarks (destination-wise vehicle details)">
          <textarea rows={2} className={inputClass} value={local.remarks} onChange={(e) => setLocal({ ...local, remarks: e.target.value })} />
        </Field>
        <Field label="All Sightseeing Vehicle Bookings Completed">
          <select className={inputClass} value={local.allCompleted ? "yes" : "no"} onChange={(e) => setLocal({ ...local, allCompleted: e.target.value === "yes" })}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </Field>
      </div>
    </SectionCard>
  );
}

function EntryTicketsCard({ value, onSave }: { value: EntryTicketsBooking; onSave: Ops["saveEntryTickets"] }) {
  const [local, setLocal] = useState(value);
  return (
    <SectionCard title="Entry Tickets" icon={<Ticket size={14} className="text-primary" />} onSave={() => onSave(local)}>
      <Field label="Included">
        <select className={inputClass} value={local.included ? "yes" : "no"} onChange={(e) => setLocal({ ...local, included: e.target.value === "yes" })}>
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </Field>
      {local.included && (
        <Field label="Ticket Details">
          <textarea rows={2} className={inputClass} value={local.ticketDetails} onChange={(e) => setLocal({ ...local, ticketDetails: e.target.value })} />
        </Field>
      )}
      <PaymentFields value={local.payment} onChange={(payment) => setLocal({ ...local, payment })} />
      <Field label="Remarks">
        <textarea rows={2} className={inputClass} value={local.remarks} onChange={(e) => setLocal({ ...local, remarks: e.target.value })} />
      </Field>
    </SectionCard>
  );
}

function GuideCard({ value, onSave }: { value: GuideBooking; onSave: Ops["saveGuide"] }) {
  const [local, setLocal] = useState(value);
  return (
    <SectionCard title="Guide" icon={<UserCog size={14} className="text-primary" />} onSave={() => onSave(local)}>
      <Field label="Included">
        <select className={inputClass} value={local.included ? "yes" : "no"} onChange={(e) => setLocal({ ...local, included: e.target.value === "yes" })}>
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </Field>
      {local.included && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Guide Name">
            <input className={inputClass} value={local.name} onChange={(e) => setLocal({ ...local, name: e.target.value })} />
          </Field>
          <Field label="Contact Number">
            <input className={inputClass} value={local.contact} onChange={(e) => setLocal({ ...local, contact: e.target.value })} />
          </Field>
          <Field label="Confirmation Status">
            <select className={inputClass} value={local.confirmationStatus} onChange={(e) => setLocal({ ...local, confirmationStatus: e.target.value as GuideBooking["confirmationStatus"] })}>
              <option value="">Select</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </Field>
        </div>
      )}
    </SectionCard>
  );
}

function FinalStatusCard({ value, onSave }: { value: FinalBookingStatus; onSave: Ops["saveFinalBookingStatus"] }) {
  const [local, setLocal] = useState(value);
  return (
    <SectionCard title="Final Booking Status" icon={<CheckCircle2 size={14} className="text-primary" />} onSave={() => onSave(local)}>
      <Field label="All Bookings Completed">
        <select className={inputClass} value={local.allCompleted ? "yes" : "no"} onChange={(e) => setLocal({ ...local, allCompleted: e.target.value === "yes" })}>
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </Field>
      <Field label="Operations Remarks">
        <textarea rows={3} className={inputClass} value={local.remarks} onChange={(e) => setLocal({ ...local, remarks: e.target.value })} />
      </Field>
    </SectionCard>
  );
}
