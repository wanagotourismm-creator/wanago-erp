"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type Recommendation = {
  type:     string;
  label:    string;
  items:    string[];
  priority: "HIGH" | "MED" | "LOW";
};

export function SmartRecommendations() {
  const [recs,    setRecs]    = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(
          query(
            collection(db, FIRESTORE_COLLECTIONS.LEADS),
            where("stage", "==", "follow_up"),
            limit(5)
          )
        );
        const followUps = snap.docs.map(d => d.data().name ?? d.data().customerName ?? "Lead");
        const result: Recommendation[] = [];
        if (followUps.length > 0) {
          result.push({
            type:     "follow_up",
            label:    "Priority follow-ups today",
            items:    followUps,
            priority: "HIGH",
          });
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
          <p className="text-xs text-muted-foreground mt-0.5">AI-powered priorities for today</p>
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
