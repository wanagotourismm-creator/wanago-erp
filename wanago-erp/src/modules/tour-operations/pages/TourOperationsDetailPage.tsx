"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, ClipboardList, CalendarClock, Map, Home } from "lucide-react";
import { useTourOperation } from "@/modules/tour-operations/hooks/useTourOperation";
import { OperationsStatusBadge } from "@/modules/tour-operations/components/OperationsStatusBadge";
import { HandoverTab } from "@/modules/tour-operations/components/HandoverTab";
import { BookingTab } from "@/modules/tour-operations/components/BookingTab";
import { PreDepartureTab } from "@/modules/tour-operations/components/PreDepartureTab";
import { OnTourTab } from "@/modules/tour-operations/components/OnTourTab";
import { ClosureTab } from "@/modules/tour-operations/components/ClosureTab";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils/helpers";

const TABS = [
  { key: "handover",      label: "Handover",      icon: Users },
  { key: "booking",       label: "Booking",       icon: ClipboardList },
  { key: "pre_departure", label: "Pre-Departure", icon: CalendarClock },
  { key: "on_tour",       label: "On-Tour",       icon: Map },
  { key: "closure",       label: "Closure",       icon: Home },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function TourOperationsDetailPage({ id }: { id: string }) {
  const ops = useTourOperation(id);
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("handover");

  return (
    <div className="space-y-5">
      <button
        onClick={() => router.push("/operations")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> Back to Tour Operations
      </button>

      {ops.loading ? (
        <SkeletonCard rows={4} />
      ) : !ops.record ? (
        <EmptyState title="Record not found" description="This tour operations record may have been deleted." />
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground">{ops.record.customerName}</h1>
              <p className="text-sm text-muted-foreground">{ops.record.refNumber} — {ops.record.destination}</p>
            </div>
            <OperationsStatusBadge status={ops.record.status} />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
                  tab === t.key
                    ? "bg-primary text-white shadow-sm"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                )}
              >
                <t.icon size={13} />
                {t.label}
              </button>
            ))}
          </div>

          {tab === "handover" && (
            <HandoverTab recordId={ops.record.id} handover={ops.record.handover} saveHandover={ops.saveHandover} />
          )}
          {tab === "booking" && <BookingTab record={ops.record} ops={ops} />}
          {tab === "pre_departure" && (
            <PreDepartureTab
              preDeparture={ops.record.preDeparture}
              guideIncluded={ops.record.guide.included}
              savePreDeparture={ops.savePreDeparture}
            />
          )}
          {tab === "on_tour" && <OnTourTab onTour={ops.record.onTour} ops={ops} />}
          {tab === "closure" && (
            <ClosureTab recordId={ops.record.id} closure={ops.record.closure} saveClosure={ops.saveClosure} />
          )}
        </>
      )}
    </div>
  );
}
