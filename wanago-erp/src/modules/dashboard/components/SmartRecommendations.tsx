"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { toDate } from "@/lib/utils/helpers";
import type { Timestamp } from "@/types/global";

type Recommendation = {
  type:     string;
  label:    string;
  items:    string[];
  priority: "HIGH" | "MED" | "LOW";
};

const STALE_DAYS = 5;

export function SmartRecommendations() {
  const [recs,    setRecs]    = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [leadsSnap, overdueSnap] = await Promise.all([
          getDocs(collection(db, FIRESTORE_COLLECTIONS.LEADS)),
          getDocs(query(collection(db, FIRESTORE_COLLECTIONS.INVOICES), where("status", "==", "overdue"), limit(5))),
        ]);
        const leads = leadsSnap.docs.map(d => d.data());
        const result: Recommendation[] = [];

        const followUps = leads
          .filter(l => l.stage === "follow_up")
          .slice(0, 5)
          .map(l => l.name ?? "Lead");
        if (followUps.length > 0) {
          result.push({ type: "follow_up", label: "Priority follow-ups today", items: followUps, priority: "HIGH" });
        }

        const staleCutoff = new Date();
        staleCutoff.setDate(staleCutoff.getDate() - STALE_DAYS);
        const stale = leads
          .filter(l => !["won", "lost"].includes(l.stage))
          .filter(l => {
            const contacted = toDate(l.lastContactedAt as Timestamp | Date | string | null | undefined);
            return !contacted || contacted < staleCutoff;
          })
          .slice(0, 5)
          .map(l => l.name ?? "Lead");
        if (stale.length > 0) {
          result.push({ type: "stale_lead", label: `Leads not contacted in ${STALE_DAYS}+ days`, items: stale, priority: "MED" });
        }

        const overdue = overdueSnap.docs.map(d => d.data().customerName ?? d.data().refNumber ?? "Invoice");
        if (overdue.length > 0) {
          result.push({ type: "overdue_invoice", label: "Overdue invoices to chase", items: overdue, priority: "HIGH" });
        }

        setRecs(result);
      } catch {
        setRecs([]);
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
          <CardTitle>Smart Recommendations</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Rule-based priorities for today</p>
        </div>
      </CardHeader>

      {loading ? (
        <div className="h-24 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : recs.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No urgent recommendations today 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recs.map((rec, i) => (
            <div key={i} className="rounded-lg border-l-4 border-l-primary bg-muted/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-foreground">{rec.label}</p>
                <Badge variant={rec.priority === "HIGH" ? "danger" : rec.priority === "MED" ? "warning" : "default"}>
                  {rec.priority}
                </Badge>
              </div>
              <ul className="space-y-1">
                {rec.items.map((item, j) => (
                  <li key={j} className="text-xs text-muted-foreground">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
