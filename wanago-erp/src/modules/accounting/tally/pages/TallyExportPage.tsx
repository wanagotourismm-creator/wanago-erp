"use client";

import { useState } from "react";
import { Download, Landmark, History } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { TallyExportPanel } from "@/modules/accounting/tally/components/TallyExportPanel";
import { TallyMappingsTable } from "@/modules/accounting/tally/components/TallyMappingsTable";
import { TallyExportHistory } from "@/modules/accounting/tally/components/TallyExportHistory";

type Tab = "export" | "mappings" | "history";
const TABS: { key: Tab; label: string; icon: typeof Download }[] = [
  { key: "export",   label: "Export",   icon: Download },
  { key: "mappings", label: "Mappings", icon: Landmark },
  { key: "history",  label: "History",  icon: History },
];

export function TallyExportPage() {
  const [tab, setTab] = useState<Tab>("export");
  const [historyKey, setHistoryKey] = useState(0);

  return (
    <div>
      <PageHeader title="Tally Export" description="Export approved invoices, payments, and paid expenses as Tally-compatible vouchers for the chosen period." />

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

      {tab === "export" && <TallyExportPanel onExported={() => setHistoryKey((k) => k + 1)} />}
      {tab === "mappings" && <TallyMappingsTable />}
      {tab === "history" && <TallyExportHistory key={historyKey} />}
    </div>
  );
}
