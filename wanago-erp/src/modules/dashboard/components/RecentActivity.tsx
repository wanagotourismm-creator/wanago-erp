"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { timeAgo } from "@/lib/utils/helpers";

type Activity = {
  id:        string;
  text:      string;
  createdAt: unknown;
  type:      "lead" | "booking" | "payment" | "general";
};

const TYPE_COLOR: Record<string, string> = {
  lead:    "bg-blue-500",
  booking: "bg-green-500",
  payment: "bg-amber-500",
  general: "bg-muted-foreground",
};

export function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [leadsSnap, bookingsSnap] = await Promise.all([
          getDocs(query(collection(db, FIRESTORE_COLLECTIONS.LEADS),    orderBy("createdAt", "desc"), limit(3))),
          getDocs(query(collection(db, FIRESTORE_COLLECTIONS.BOOKINGS), orderBy("createdAt", "desc"), limit(3))),
        ]);

        const items: Activity[] = [
          ...leadsSnap.docs.map(d => ({
            id:        d.id,
            text:      `New lead: ${d.data().name ?? d.data().customerName ?? "Unknown"} → ${d.data().destination ?? ""}`,
            createdAt: d.data().createdAt,
            type:      "lead" as const,
          })),
          ...bookingsSnap.docs.map(d => ({
            id:        d.id,
            text:      `Booking ${d.data().refNumber ?? d.id.slice(0,6)} — ${d.data().customerName ?? "Unknown"}`,
            createdAt: d.data().createdAt,
            type:      "booking" as const,
          })),
        ].sort((a, b) => {
          const ta = (a.createdAt as { seconds?: number })?.seconds ?? 0;
          const tb = (b.createdAt as { seconds?: number })?.seconds ?? 0;
          return tb - ta;
        }).slice(0, 6);

        setActivities(items);
      } catch {
        setActivities([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>

      {loading ? (
        <div className="h-24 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : activities.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((a) => (
            <div key={a.id} className="flex items-start gap-3">
              <div className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${TYPE_COLOR[a.type]}`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-foreground leading-snug">{a.text}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {timeAgo(a.createdAt as never)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
