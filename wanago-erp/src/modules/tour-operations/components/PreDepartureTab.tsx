"use client";

import { useState } from "react";
import { CalendarClock, MessageCircle, UserCog, Signpost } from "lucide-react";
import { Field, inputClass, SectionCard } from "@/modules/tour-operations/components/shared";
import type { useTourOperation } from "@/modules/tour-operations/hooks/useTourOperation";
import type { PreDeparture } from "@/modules/tour-operations/types";

export function PreDepartureTab({ preDeparture, guideIncluded, savePreDeparture }: {
  preDeparture:     PreDeparture;
  guideIncluded:    boolean;
  savePreDeparture: ReturnType<typeof useTourOperation>["savePreDeparture"];
}) {
  const [local, setLocal] = useState(preDeparture);

  return (
    <SectionCard title="Pre-Departure Operations" icon={<CalendarClock size={14} className="text-primary" />} onSave={() => savePreDeparture(local)}>

      {/* 1. Reconfirm all bookings (7 days before travel) */}
      <div>
        <p className="mb-2 text-xs font-semibold text-foreground">1. Re-confirm All Bookings (7 Days Before Travel)</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Status">
            <select
              className={inputClass}
              value={local.reconfirmBookings.status}
              onChange={(e) => setLocal({ ...local, reconfirmBookings: { ...local.reconfirmBookings, status: e.target.value as PreDeparture["reconfirmBookings"]["status"] } })}
            >
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </Field>
          <Field label="Remarks">
            <input className={inputClass} value={local.reconfirmBookings.remarks} onChange={(e) => setLocal({ ...local, reconfirmBookings: { ...local.reconfirmBookings, remarks: e.target.value } })} />
          </Field>
        </div>
      </div>

      {/* 2. WhatsApp group creation (3 days before travel) */}
      <div className="border-t border-border pt-4">
        <div className="mb-2 flex items-center gap-2">
          <MessageCircle size={13} className="text-primary" />
          <p className="text-xs font-semibold text-foreground">2. WhatsApp Group Creation (3 Days Before Travel)</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 mb-3">
          {([
            ["groupCreated", "WhatsApp Group Created"],
            ["tourPlanExplained", "Tour Plan Explained"],
            ["guestDoubtsCleared", "Guest Doubts Cleared"],
            ["tourManagerIntroduced", "Tour Manager Introduced"],
            ["guideIntroduced", "Guide Introduced (If Applicable)"],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={local.whatsappGroup.checklist[key]}
                onChange={(e) => setLocal({ ...local, whatsappGroup: { ...local.whatsappGroup, checklist: { ...local.whatsappGroup.checklist, [key]: e.target.checked } } })}
              />
              {label}
            </label>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Status">
            <select
              className={inputClass}
              value={local.whatsappGroup.status}
              onChange={(e) => setLocal({ ...local, whatsappGroup: { ...local.whatsappGroup, status: e.target.value as "completed" | "pending" } })}
            >
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </Field>
          <Field label="Remarks">
            <input className={inputClass} value={local.whatsappGroup.remarks} onChange={(e) => setLocal({ ...local, whatsappGroup: { ...local.whatsappGroup, remarks: e.target.value } })} />
          </Field>
        </div>
      </div>

      {/* 3. Guide briefing (only if guide included) */}
      {guideIncluded && (
        <div className="border-t border-border pt-4">
          <div className="mb-2 flex items-center gap-2">
            <UserCog size={13} className="text-primary" />
            <p className="text-xs font-semibold text-foreground">3. Guide Briefing</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-1 mb-3">
            {([
              ["packageInstructionsExplained", "Package Instructions Explained"],
              ["dayWiseTourPlanExplained", "Day-wise Tour Plan Explained"],
              ["coordinatorSopExplained", "Coordinator SOP Explained"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={local.guideBriefing.checklist[key]}
                  onChange={(e) => setLocal({ ...local, guideBriefing: { ...local.guideBriefing, checklist: { ...local.guideBriefing.checklist, [key]: e.target.checked } } })}
                />
                {label}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Status">
              <select
                className={inputClass}
                value={local.guideBriefing.status}
                onChange={(e) => setLocal({ ...local, guideBriefing: { ...local.guideBriefing, status: e.target.value as "completed" | "pending" } })}
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </Field>
            <Field label="Remarks">
              <input className={inputClass} value={local.guideBriefing.remarks} onChange={(e) => setLocal({ ...local, guideBriefing: { ...local.guideBriefing, remarks: e.target.value } })} />
            </Field>
          </div>
        </div>
      )}

      {/* 4. Welcome board */}
      <div className="border-t border-border pt-4">
        <div className="mb-2 flex items-center gap-2">
          <Signpost size={13} className="text-primary" />
          <p className="text-xs font-semibold text-foreground">4. Welcome Board Arrangement (If Required)</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Status">
            <select
              className={inputClass}
              value={local.welcomeBoard.status}
              onChange={(e) => setLocal({ ...local, welcomeBoard: { ...local.welcomeBoard, status: e.target.value as "completed" | "pending" } })}
            >
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </Field>
          <Field label="Remarks">
            <input className={inputClass} value={local.welcomeBoard.remarks} onChange={(e) => setLocal({ ...local, welcomeBoard: { ...local.welcomeBoard, remarks: e.target.value } })} />
          </Field>
        </div>
      </div>

    </SectionCard>
  );
}
