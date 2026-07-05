"use client";

import { Building2, Home } from "lucide-react";
import { Card } from "@/components/ui/Card";

type Props = { officePct: number; wfhPct: number };

export function OnsiteRemoteSplit({ officePct, wfhPct }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <Card tone="dark" radius="3xl" className="flex-1">
        <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
          <Building2 size={15} />
        </div>
        <p className="text-2xl font-bold">{officePct}%</p>
        <p className="text-xs text-dark-surface-foreground/70">In-Office</p>
      </Card>
      <Card radius="3xl" className="flex-1">
        <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
          <Home size={15} className="text-primary" />
        </div>
        <p className="text-2xl font-bold text-foreground">{wfhPct}%</p>
        <p className="text-xs text-muted-foreground">WFH</p>
      </Card>
    </div>
  );
}
