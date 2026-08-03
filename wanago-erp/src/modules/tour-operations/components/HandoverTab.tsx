"use client";

import { useState } from "react";
import { Users, Bus, Hotel, Ticket, ListChecks, Wallet, StickyNote, Upload, X } from "lucide-react";
import { uploadFile } from "@/lib/storage/upload";
import { Field, inputClass, SectionCard } from "@/modules/tour-operations/components/shared";
import type { useTourOperation } from "@/modules/tour-operations/hooks/useTourOperation";
import type { OperationsHandover } from "@/modules/tour-operations/types";

const TRAVEL_TYPES: { value: OperationsHandover["travelType"]; label: string }[] = [
  { value: "family",     label: "Family" },
  { value: "bachelors",  label: "Bachelor's" },
  { value: "corporate",  label: "Corporate" },
  { value: "students",   label: "Students" },
  { value: "mixed",      label: "Mixed Group (Family + Bachelor's)" },
];

const PACKAGE_CATEGORIES: { value: OperationsHandover["packageCategory"]; label: string }[] = [
  { value: "budget",  label: "Budget" },
  { value: "2_star",  label: "2 Star" },
  { value: "3_star",  label: "3 Star" },
  { value: "4_star",  label: "4 Star" },
  { value: "5_star",  label: "5 Star" },
  { value: "other",   label: "Other" },
];

function parseAges(text: string): number[] {
  return text.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n) && n >= 0);
}

export function HandoverTab({ recordId, handover, saveHandover }: {
  recordId:     string;
  handover:     OperationsHandover;
  saveHandover: ReturnType<typeof useTourOperation>["saveHandover"];
}) {
  const [local, setLocal] = useState<OperationsHandover>(handover);
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof OperationsHandover>(k: K, v: OperationsHandover[K]) => setLocal((p) => ({ ...p, [k]: v }));

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const url = await uploadFile(`operations/${recordId}/id-cards/${crypto.randomUUID()}-${file.name}`, file);
        setLocal((p) => ({ ...p, idCardUrls: [...p.idCardUrls, url] }));
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <SectionCard title="Sales → Operations Handover" icon={<Users size={14} className="text-primary" />} onSave={() => saveHandover(local)}>

      {/* Customer details */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Travel Date Remarks">
          <input className={inputClass} value={local.travelDateRemarks} onChange={(e) => set("travelDateRemarks", e.target.value)} />
        </Field>
        <Field label="Place">
          <input className={inputClass} value={local.place} onChange={(e) => set("place", e.target.value)} />
        </Field>
        <Field label="Adult Ages (comma-separated)">
          <input
            className={inputClass}
            placeholder="e.g. 32, 30"
            defaultValue={local.adultAges.join(", ")}
            onBlur={(e) => set("adultAges", parseAges(e.target.value))}
          />
        </Field>
        <Field label="Children Ages (comma-separated)">
          <input
            className={inputClass}
            placeholder="e.g. 6, 3"
            defaultValue={local.childAges.join(", ")}
            onBlur={(e) => set("childAges", parseAges(e.target.value))}
          />
        </Field>
      </div>

      <Field label="ID Card Upload (Attested Copy)">
        <div className="flex flex-wrap items-center gap-2">
          {local.idCardUrls.map((url, i) => (
            <a key={url} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-foreground hover:border-primary/40">
              ID Card {i + 1}
              <X
                size={12}
                className="text-muted-foreground hover:text-destructive"
                onClick={(e) => { e.preventDefault(); setLocal((p) => ({ ...p, idCardUrls: p.idCardUrls.filter((u) => u !== url) })); }}
              />
            </a>
          ))}
          <label className="flex items-center gap-1.5 rounded-lg border border-dashed border-input px-2.5 py-1.5 text-xs text-muted-foreground cursor-pointer hover:border-primary/40">
            <Upload size={12} />
            {uploading ? "Uploading..." : "Upload"}
            <input type="file" multiple accept="image/*,.pdf" className="hidden" onChange={handleFiles} disabled={uploading} />
          </label>
        </div>
      </Field>

      {/* Travel type / package category */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Travel Type">
          <select className={inputClass} value={local.travelType} onChange={(e) => set("travelType", e.target.value as OperationsHandover["travelType"])}>
            <option value="">Select type</option>
            {TRAVEL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Package Category">
          <select className={inputClass} value={local.packageCategory} onChange={(e) => set("packageCategory", e.target.value as OperationsHandover["packageCategory"])}>
            <option value="">Select category</option>
            {PACKAGE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
        {local.packageCategory === "other" && (
          <Field label="Package Category (Manual Entry)" className="sm:col-span-2">
            <input className={inputClass} value={local.packageCategoryOther} onChange={(e) => set("packageCategoryOther", e.target.value)} />
          </Field>
        )}
      </div>

      {/* Transportation */}
      <div className="border-t border-border pt-4">
        <div className="mb-3 flex items-center gap-2">
          <Bus size={14} className="text-primary" />
          <p className="text-xs font-semibold text-foreground">Transportation</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Arrival/Departure Mode">
            <select className={inputClass} value={local.arrivalDeparture.mode} onChange={(e) => set("arrivalDeparture", { ...local.arrivalDeparture, mode: e.target.value as OperationsHandover["arrivalDeparture"]["mode"] })}>
              <option value="">Select mode</option>
              <option value="flight">Flight</option>
              <option value="train">Train</option>
              <option value="bus">Bus</option>
              <option value="other">Other</option>
            </select>
          </Field>
          {local.arrivalDeparture.mode === "other" && (
            <Field label="Mode (Manual Entry)">
              <input className={inputClass} value={local.arrivalDeparture.modeOther} onChange={(e) => set("arrivalDeparture", { ...local.arrivalDeparture, modeOther: e.target.value })} />
            </Field>
          )}
          <Field label="Seat/Class Category">
            <input className={inputClass} value={local.arrivalDeparture.seatClass} onChange={(e) => set("arrivalDeparture", { ...local.arrivalDeparture, seatClass: e.target.value })} />
          </Field>
          <Field label="Arrival/Departure Remarks">
            <input className={inputClass} value={local.arrivalDeparture.remarks} onChange={(e) => set("arrivalDeparture", { ...local.arrivalDeparture, remarks: e.target.value })} />
          </Field>
          <Field label="Sightseeing Vehicle Type">
            <input className={inputClass} placeholder="Sedan AC, Innova, Traveller..." value={local.sightseeingVehicle.vehicleType} onChange={(e) => set("sightseeingVehicle", { ...local.sightseeingVehicle, vehicleType: e.target.value })} />
          </Field>
          <Field label="Sightseeing Remarks">
            <input className={inputClass} value={local.sightseeingVehicle.remarks} onChange={(e) => set("sightseeingVehicle", { ...local.sightseeingVehicle, remarks: e.target.value })} />
          </Field>
        </div>
      </div>

      {/* Hotel */}
      <div className="border-t border-border pt-4">
        <div className="mb-3 flex items-center gap-2">
          <Hotel size={14} className="text-primary" />
          <p className="text-xs font-semibold text-foreground">Hotel Details</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Hotel Category">
            <input className={inputClass} value={local.hotelPref.category} onChange={(e) => set("hotelPref", { ...local.hotelPref, category: e.target.value })} />
          </Field>
          <Field label="Number of Rooms">
            <input type="number" min={0} className={inputClass} value={local.hotelPref.numberOfRooms} onChange={(e) => set("hotelPref", { ...local.hotelPref, numberOfRooms: Number(e.target.value) })} />
          </Field>
          <Field label="Room Sharing">
            <select className={inputClass} value={local.hotelPref.roomSharing} onChange={(e) => set("hotelPref", { ...local.hotelPref, roomSharing: e.target.value as OperationsHandover["hotelPref"]["roomSharing"] })}>
              <option value="">Select</option>
              <option value="double">Double</option>
              <option value="triple">Triple</option>
              <option value="quad">Quad</option>
              <option value="other">Other</option>
            </select>
          </Field>
          {local.hotelPref.roomSharing === "other" && (
            <Field label="Room Sharing (Manual Entry)">
              <input className={inputClass} value={local.hotelPref.roomSharingOther} onChange={(e) => set("hotelPref", { ...local.hotelPref, roomSharingOther: e.target.value })} />
            </Field>
          )}
          <Field label="Extra Requirements / Special Requests" className="sm:col-span-2">
            <textarea rows={2} className={inputClass} value={local.hotelPref.extraRequirements} onChange={(e) => set("hotelPref", { ...local.hotelPref, extraRequirements: e.target.value })} />
          </Field>
        </div>
      </div>

      {/* Entry tickets / activities / guide */}
      <div className="border-t border-border pt-4">
        <div className="mb-3 flex items-center gap-2">
          <Ticket size={14} className="text-primary" />
          <p className="text-xs font-semibold text-foreground">Entry Tickets, Activities &amp; Guide</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Entry Tickets">
            <select className={inputClass} value={local.entryTicketsPref.included ? "yes" : "no"} onChange={(e) => set("entryTicketsPref", { ...local.entryTicketsPref, included: e.target.value === "yes" })}>
              <option value="no">Not Included</option>
              <option value="yes">Included</option>
            </select>
          </Field>
          <Field label="Entry Ticket Remarks">
            <input className={inputClass} value={local.entryTicketsPref.remarks} onChange={(e) => set("entryTicketsPref", { ...local.entryTicketsPref, remarks: e.target.value })} />
          </Field>
          <Field label="Guide">
            <select className={inputClass} value={local.guideIncluded ? "yes" : "no"} onChange={(e) => set("guideIncluded", e.target.value === "yes")}>
              <option value="no">Not Included</option>
              <option value="yes">Included</option>
            </select>
          </Field>
          <Field label="Included Activities" className="sm:col-span-2">
            <textarea rows={2} className={inputClass} value={local.activities} onChange={(e) => set("activities", e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Package cost */}
      <div className="border-t border-border pt-4">
        <div className="mb-3 flex items-center gap-2">
          <Wallet size={14} className="text-primary" />
          <p className="text-xs font-semibold text-foreground">Package Cost</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Package Net Rate (₹)">
            <input type="number" min={0} className={inputClass} value={local.packageCost.netRate} onChange={(e) => set("packageCost", { ...local.packageCost, netRate: Number(e.target.value) })} />
          </Field>
          <Field label="Selling Rate (₹)">
            <input type="number" min={0} className={inputClass} value={local.packageCost.sellingRate} onChange={(e) => set("packageCost", { ...local.packageCost, sellingRate: Number(e.target.value) })} />
          </Field>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <div className="mb-3 flex items-center gap-2">
          <StickyNote size={14} className="text-primary" />
          <p className="text-xs font-semibold text-foreground">Overall Remarks</p>
        </div>
        <Field label="Additional inclusions, exclusions, special requests, or package-specific information">
          <textarea rows={3} className={inputClass} value={local.overallRemarks} onChange={(e) => set("overallRemarks", e.target.value)} />
        </Field>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ListChecks size={12} /> Save each section as you fill it in — it&apos;s saved to this record immediately.
      </p>

    </SectionCard>
  );
}
