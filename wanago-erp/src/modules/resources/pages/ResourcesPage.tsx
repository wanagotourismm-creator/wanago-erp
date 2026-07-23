"use client";

import { useState } from "react";
import { Truck, Calendar, CalendarOff, BarChart3, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ResourcesTable } from "@/modules/resources/components/ResourcesTable";
import { ResourceCalendarGrid } from "@/modules/resources/components/ResourceCalendarGrid";
import { ResourceAssignmentForm } from "@/modules/resources/components/ResourceAssignmentForm";
import { BlackoutsTable } from "@/modules/resources/components/BlackoutsTable";
import { UtilizationReport } from "@/modules/resources/components/UtilizationReport";
import { useResourceAssignments } from "@/modules/resources/hooks/useResourceAssignments";

type Tab = "resources" | "calendar" | "blackouts" | "utilization";
const TABS: { key: Tab; label: string; icon: typeof Truck }[] = [
  { key: "resources",   label: "Resources",   icon: Truck },
  { key: "calendar",    label: "Calendar",    icon: Calendar },
  { key: "blackouts",   label: "Blackouts",   icon: CalendarOff },
  { key: "utilization", label: "Utilization", icon: BarChart3 },
];

export function ResourcesPage() {
  const [tab, setTab] = useState<Tab>("resources");
  const [assigning, setAssigning] = useState(false);
  const { addAssignment } = useResourceAssignments();

  return (
    <div>
      <PageHeader
        title="Resources & Availability"
        description="Vehicles, drivers, guides, and room blocks — assign to bookings with automatic conflict detection."
        actions={
          <button onClick={() => setAssigning(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
            <Plus size={14} /> Assign Resource
          </button>
        }
      />

      {assigning && (
        <div className="mb-6">
          <ResourceAssignmentForm
            onSave={(data, blackouts) => addAssignment(data, blackouts)}
            onCancel={() => setAssigning(false)}
          />
        </div>
      )}

      <div className="mb-6 flex gap-1 rounded-xl border border-border bg-muted/30 p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === "resources" && <ResourcesTable />}
      {tab === "calendar" && <ResourceCalendarGrid />}
      {tab === "blackouts" && <BlackoutsTable />}
      {tab === "utilization" && <UtilizationReport />}
    </div>
  );
}
