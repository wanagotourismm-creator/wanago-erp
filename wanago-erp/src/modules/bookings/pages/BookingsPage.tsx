"use client";

import { useState, useMemo } from "react";
import { Plus, Search, RefreshCw } from "lucide-react";
import { useBookings } from "@/modules/bookings/hooks/useBookings";
import { BookingsTable } from "@/modules/bookings/components/BookingsTable";
import { BookingForm } from "@/modules/bookings/components/BookingForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { formatCurrency } from "@/lib/utils/helpers";
import { cn } from "@/lib/utils/helpers";
import type { Booking } from "@/modules/bookings/types";
import type { BookingSchema } from "@/modules/bookings/schemas";

const FILTERS = [
  { value: "",                 label: "All"              },
  { value: "pending_finance",  label: "Pending Finance"  },
  { value: "finance_approved", label: "Finance Approved" },
  { value: "ops_pending",      label: "Ops Pending"      },
  { value: "confirmed",        label: "Confirmed"        },
  { value: "completed",        label: "Completed"        },
  { value: "cancelled",        label: "Cancelled"        },
];

export function BookingsPage() {
  const { bookings, loading, stats, addBooking, editBooking, changeStatus, removeBooking, load } = useBookings();
  const { user } = useAuthStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => bookings.filter(b => {
    const mF = !filter || b.bookingStatus === filter;
    const mS = !search || [b.customerName, b.customerPhone, b.destination, b.refNumber].some(f => f?.toLowerCase().includes(search.toLowerCase()));
    return mF && mS;
  }), [bookings, filter, search]);

  async function handleSubmit(data: BookingSchema) {
    const payload = {
      ...data,
      leadId: data.leadId || null, customerId: data.customerId || null,
      customerEmail: data.customerEmail || null, assignedTo: data.assignedTo || null,
      agentName: data.agentName || null, supplierId: data.supplierId || null,
      supplierName: data.supplierName || null, itinerary: data.itinerary || null,
      notes: data.notes || null, specialRequests: data.specialRequests || null,
      createdBy: user?.uid ?? "", status: "active", confirmedAt: null, cancelledAt: null,
    };
    if (editing) await editBooking(editing.id, payload as never);
    else await addBooking(payload as never);
    setFormOpen(false); setEditing(null);
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Bookings" description={`${bookings.length} total bookings`}
        actions={<>
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={load}>Refresh</Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => { setEditing(null); setFormOpen(true); }}>New Booking</Button>
        </>} />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label:"Total Revenue",  value:formatCurrency(stats.revenue),   icon:"💰", color:"text-blue-600"  },
          { label:"Collected",      value:formatCurrency(stats.collected),  icon:"✅", color:"text-green-600" },
          { label:"Balance Due",    value:formatCurrency(stats.balance),    icon:"⏳", color:"text-amber-600" },
          { label:"Confirmed",      value:stats.confirmed,                  icon:"📅", color:"text-primary"   },
        ].map(s => (
          <div key={s.label} className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin flex-1">
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={cn("flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
                filter === f.value ? "bg-primary text-white shadow-sm" : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40")}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search bookings..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-64 rounded-xl border border-input bg-card pl-9 pr-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" />
        </div>
      </div>

      <BookingsTable bookings={filtered} loading={loading}
        onEdit={b => { setEditing(b); setFormOpen(true); }}
        onDelete={async b => { if (confirm(`Delete booking ${b.refNumber}?`)) await removeBooking(b.id); }}
        onStatusChange={(b, status) => changeStatus(b.id, status)} />

      <BookingForm open={formOpen} booking={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSubmit} />
    </div>
  );
}
