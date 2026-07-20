"use client";

import { useState } from "react";
import { Workflow, Users, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { JourneysTable } from "@/modules/journeys/components/JourneysTable";
import { SegmentsTable } from "@/modules/journeys/components/SegmentsTable";
import { JourneyAnalytics } from "@/modules/journeys/components/JourneyAnalytics";

type Tab = "journeys" | "segments" | "analytics";
const TABS: { key: Tab; label: string; icon: typeof Workflow }[] = [
  { key: "journeys",  label: "Journeys",  icon: Workflow },
  { key: "segments",  label: "Segments",  icon: Users },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
];

export function JourneysPage() {
  const [tab, setTab] = useState<Tab>("journeys");

  return (
    <div>
      <PageHeader
        title="Marketing Automation"
        description="Config-driven drip journeys — quote follow-ups, post-trip messages, and segment targeting. Steps run at most once per day, not instantly."
      />

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

      {tab === "journeys" && <JourneysTable />}
      {tab === "segments" && <SegmentsTable />}
      {tab === "analytics" && <JourneyAnalytics />}
    </div>
  );
}
