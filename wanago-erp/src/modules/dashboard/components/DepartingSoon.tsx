"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS, BOOKING_STATUS } from "@/lib/constants";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils/helpers";
import { Plane } from "lucide-react";

// travelDate is stored as a plain "YYYY-MM-DD" string (from a <input
// type="date">), so lexicographic string comparison sorts/ranges it
// correctly — no need to parse into a Firestore Timestamp.
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type Departure = {
  id:           string;
  customerName: string;
  destination:  string;
  travelDate:   unknown;
  pax:          number;
  status:       string;
};

export function DepartingSoon() {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const now = new Date();
        const end = new Date();
        end.setDate(end.getDate() + 14);

        // Previously fetched the ENTIRE bookings collection (no where,
        // no limit) just to slice out the next 5 departures — narrowed to
        // exactly the date range this card needs. Over-fetches a little
        // (limit 10, not 5) purely to leave room for the cancelled/
        // completed filter below without a composite index — Firestore
        // requires one to combine an equality filter (status) with a
        // range filter (travelDate) on different fields; cheaper to
        // filter out the rare cancelled-in-range booking client-side.
        const snap = await getDocs(
          query(
            collection(db, FIRESTORE_COLLECTIONS.BOOKINGS),
            where("travelDate", ">=", isoDate(now)),
            where("travelDate", "<=", isoDate(end)),
            orderBy("travelDate", "asc"),
            limit(10)
          )
        );

        const upcoming = snap.docs
          .map(d => ({ id: d.id, ...d.data() }) as Departure)
          .filter(b => b.status !== BOOKING_STATUS.CANCELLED && b.status !== BOOKING_STATUS.COMPLETED)
          .slice(0, 5);

        setDepartures(upcoming);
      } catch {
        setDepartures([]);
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
          <CardTitle>Departing Soon</CardTitle>
        </div>
        <span className="text-xs text-muted-foreground">Next 14 days</span>
      </CardHeader>

      {loading ? (
        <div className="h-24 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : departures.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Plane size={28} className="text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground font-medium">No upcoming departures</p>
        </div>
      ) : (
        <div className="space-y-2">
          {departures.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{d.customerName}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{d.destination}</p>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <p className="text-xs font-medium text-foreground">{formatDate(d.travelDate as never)}</p>
                <p className="text-[10px] text-muted-foreground">{d.pax ?? 1} pax</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
