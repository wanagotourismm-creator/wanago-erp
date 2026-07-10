"use client";

import { useEffect, useState } from "react";
import { fetchBookings } from "@/modules/bookings/services/booking.service";
import { useAuthStore } from "@/store/auth.store";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils/helpers";
import { BOOKING_STATUS, SYSTEM_ROLES } from "@/lib/constants";
import { Wallet } from "lucide-react";
import type { Booking } from "@/modules/bookings/types";

function DuesColumn({ title, bookings }: { title: string; bookings: Booking[] }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {bookings.length}
        </span>
      </div>
      {bookings.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">Nothing waiting</p>
      ) : (
        <div className="space-y-2">
          {bookings.slice(0, 5).map((b) => (
            <div key={b.id} className="rounded-lg border border-border p-2.5 hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-foreground truncate">{b.refNumber}</p>
                <p className="text-xs font-semibold text-foreground flex-shrink-0">{formatCurrency(b.totalAmount)}</p>
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground truncate">{b.customerName}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PendingDuesPanel() {
  const { user } = useAuthStore();
  const [financeQueue, setFinanceQueue] = useState<Booking[]>([]);
  const [opsQueue,     setOpsQueue]     = useState<Booking[]>([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [finance, ops] = await Promise.all([
          fetchBookings({ status: BOOKING_STATUS.PENDING_FINANCE }),
          fetchBookings({ status: BOOKING_STATUS.OPS_PENDING }),
        ]);
        setFinanceQueue(finance);
        setOpsQueue(ops);
      } catch (err) {
        console.error("[PendingDuesPanel] failed to load approval queues — showing as empty:", err);
        setFinanceQueue([]);
        setOpsQueue([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const role = user?.systemRole;
  const showFinance = role === SYSTEM_ROLES.FINANCE || role === SYSTEM_ROLES.ADMIN || role === SYSTEM_ROLES.SUPER_ADMIN;
  const showOps     = role === SYSTEM_ROLES.OPERATIONS || role === SYSTEM_ROLES.ADMIN || role === SYSTEM_ROLES.SUPER_ADMIN;

  if (!showFinance && !showOps) return null;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Pending Dues</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">Bookings waiting on approval</p>
        </div>
      </CardHeader>

      {loading ? (
        <div className="h-24 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : !showFinance && !showOps ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Wallet size={28} className="text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground font-medium">Nothing to approve</p>
        </div>
      ) : (
        <div className="flex gap-4">
          {showFinance && <DuesColumn title="Awaiting Finance" bookings={financeQueue} />}
          {showOps && <DuesColumn title="Awaiting Operations" bookings={opsQueue} />}
        </div>
      )}
    </Card>
  );
}
