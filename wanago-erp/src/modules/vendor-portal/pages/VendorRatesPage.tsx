"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tag, CalendarRange } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { VendorRatesTable } from "@/modules/vendor-portal/components/VendorRatesTable";
import { VendorAvailabilityTable } from "@/modules/vendor-portal/components/VendorAvailabilityTable";

type Tab = "rates" | "availability";
const TABS: { key: Tab; label: string; icon: typeof Tag }[] = [
  { key: "rates",        label: "Rates",        icon: Tag },
  { key: "availability", label: "Availability", icon: CalendarRange },
];

export function VendorRatesPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("rates");
  const [supplierIdFilter, setSupplierIdFilter] = useState(searchParams.get("supplierId") ?? "");

  return (
    <div>
      <PageHeader
        title="Vendor Rates & Availability"
        description="Rates and availability submitted by vendors, or entered directly by staff."
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

      {tab === "rates" && <VendorRatesTable supplierIdFilter={supplierIdFilter} onSupplierIdFilterChange={setSupplierIdFilter} />}
      {tab === "availability" && <VendorAvailabilityTable supplierIdFilter={supplierIdFilter} onSupplierIdFilterChange={setSupplierIdFilter} />}
    </div>
  );
}
