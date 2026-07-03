"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FIRESTORE_COLLECTIONS } from "@/lib/constants";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatDate, toDate } from "@/lib/utils/helpers";
import { Badge } from "@/components/ui/Badge";
import { Plane } from "lucide-react";

type Departure = {
  id:           string;
  customerName: string;
  destination:  string;
  departureDate: unknown;
  pax:          number;
  status:       string;
};

export function DepartingSoon() {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const now  = new Date();
        const end  = new Date();
        end.setDate(end.getDate() + 14);

        const snap = await getDocs(
          query(collection(db, FIRESTORE_COLLECTIONS.BOOKINGS), orderBy("departureDate", "asc"))
        );

        const upcoming = snap.docs
          .map(d => ({ id: d.id, ...d.data() }) as Departure)
          .filter(b => {
            const d = toDate(b.departureDate as never);
            return d && d >= now && d <= end;
          })
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
                <p className="text-xs font-medium text-foreground">{formatDate(d.departureDate as never)}</p>
                <p className="text-[10px] text-muted-foreground">{d.pax ?? 1} pax</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
