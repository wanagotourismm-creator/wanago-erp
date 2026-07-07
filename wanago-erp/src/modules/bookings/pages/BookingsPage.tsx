"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Search, RefreshCw, Briefcase, Clock, CheckCircle2, Wallet, UploadCloud } from "lucide-react";
import { useBookings } from "@/modules/bookings/hooks/useBookings";
import { BookingsTable } from "@/modules/bookings/components/BookingsTable";
import { BookingDetailModal } from "@/modules/bookings/components/BookingDetailModal";
import { BookingForm } from "@/modules/bookings/components/BookingForm";
import { formatAmount } from "@/modules/bookings/components/BookingBadges";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/rbac";
import { cn } from "@/lib/utils/helpers";
import { BOOKING_STATUS_LABELS } from "@/lib/constants";
import { BulkImportModal, type TemplateColumn, type ParseRowResult } from "@/components/bulk/BulkImportModal";
import { BulkExportButton } from "@/components/bulk/BulkExportButton";
import { resolveOffice } from "@/lib/bulk/resolveOffice";
import { bookingSchema } from "@/modules/bookings/schemas";
import { fetchCustomers } from "@/modules/customers/services/customer.service";
import { fetchPackages } from "@/modules/packages/services/package.service";
import { fetchOffices } from "@/modules/admin/offices/services/office.service";
import type { Booking, BookingFormData } from "@/modules/bookings/types";
import type { BookingSchema } from "@/modules/bookings/schemas";
import type { Customer } from "@/modules/customers/types";
import type { Package } from "@/modules/packages/types";
import type { Office } from "@/modules/admin/offices/types";

const BOOKING_TEMPLATE_COLUMNS: TemplateColumn[] = [
  { key: "customerPhone", label: "Customer Phone", required: true, example: "9876543210" },
  { key: "destination",   label: "Destination",     required: true, example: "Bali" },
  { key: "tripType",      label: "Trip Type",       required: true, example: "domestic" },
  { key: "packageTitle",  label: "Package Title",   example: "Bali Getaway" },
  { key: "travelDate",    label: "Travel Date",     example: "2026-08-01" },
  { key: "returnDate",    label: "Return Date",     example: "2026-08-07" },
  { key: "pax",           label: "Pax",              required: true, example: "2" },
  { key: "totalAmount",   label: "Total Amount",    required: true, example: "150000" },
  { key: "advanceAmount", label: "Advance Amount",  example: "50000" },
  { key: "agentName",     label: "Agent Name",      example: "John Doe" },
  { key: "office",        label: "Office",          example: "Head Office" },
  { key: "notes",         label: "Notes",           example: "" },
];

const STATUS_FILTERS = [
  { value: "", label: "All" },
  ...Object.entries(BOOKING_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

export function BookingsPage() {
  const {
    bookings, loading, addBooking, editBooking, changeStatus,
    removeBooking, load,
  } = useBookings();
  const { user } = useAuthStore();
  const canCreate  = !!user && hasPermission(user.systemRole, "bookings:create");
  const canManage  = !!user && hasPermission(user.systemRole, "bookings:edit");
  const canApprove = !!user && hasPermission(user.systemRole, "bookings:approve");

  const [formOpen,       setFormOpen]       = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
  const [statusFilter,   setStatusFilter]   = useState("");
  const [search,         setSearch]         = useState("");

  const [importOpen, setImportOpen] = useState(false);
  const [customers,  setCustomers]  = useState<Customer[]>([]);
  const [packages,   setPackages]   = useState<Package[]>([]);
  const [offices,    setOffices]    = useState<Office[]>([]);

  useEffect(() => {
    fetchCustomers().then(setCustomers).catch(() => {});
    fetchPackages().then(setPackages).catch(() => {});
    fetchOffices().then(setOffices).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const matchStatus = !statusFilter || b.status === statusFilter;
      const matchSearch = !search || [b.customerName, b.customerPhone, b.destination, b.refNumber]
        .some(f => f?.toLowerCase().includes(search.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [bookings, statusFilter, search]);

  const stats = useMemo(() => {
    const confirmed = bookings.filter(b => b.status === "confirmed" || b.status === "completed").length;
    const pending   = bookings.filter(b => b.status === "pending_finance" || b.status === "ops_pending").length;
    const dueAmount = bookings.reduce((sum, b) => sum + b.balanceAmount, 0);
    return { total: bookings.length, confirmed, pending, dueAmount };
  }, [bookings]);

  const exportRows = useMemo(() => filtered.map((b) => ({
    "Customer Phone":  b.customerPhone,
    "Destination":     b.destination,
    "Trip Type":       b.tripType,
    "Package Title":   b.packageName ?? "",
    "Travel Date":     b.travelDate ?? "",
    "Return Date":     b.returnDate ?? "",
    "Pax":             b.pax,
    "Total Amount":    b.totalAmount,
    "Advance Amount":  b.advanceAmount,
    "Agent Name":      b.agentName ?? "",
    "Office":          b.officeName,
    "Notes":           b.notes ?? "",
  })), [filtered]);

  function onParseRow(raw: Record<string, string>): ParseRowResult<BookingFormData> {
    const phone = raw["Customer Phone"]?.trim();
    const customer = customers.find((c) => c.phone === phone);
    if (!customer) {
      return { error: `No customer found with phone '${phone ?? ""}' — import/create the customer first` };
    }

    const pkgTitle = raw["Package Title"]?.trim();
    const pkg = pkgTitle ? packages.find((p) => p.title.toLowerCase() === pkgTitle.toLowerCase()) : undefined;

    const office = resolveOffice(raw["Office"], offices, {
      officeId:   user?.officeId   ?? "main",
      officeName: user?.officeName ?? "Head Office",
    });

    const candidate = {
      customerId:    customer.id,
      customerName:  customer.fullName,
      customerPhone: customer.phone,
      destination:   raw["Destination"] ?? "",
      tripType:      raw["Trip Type"] ?? "",
      packageId:     pkg?.id ?? "",
      packageName:   pkg?.title ?? pkgTitle ?? "",
      travelDate:    raw["Travel Date"] ?? "",
      returnDate:    raw["Return Date"] ?? "",
      pax:           raw["Pax"] ?? "",
      totalAmount:   raw["Total Amount"] ?? "",
      advanceAmount: raw["Advance Amount"] ?? "",
      assignedTo:    "",
      agentName:     raw["Agent Name"] ?? "",
      officeId:      office.officeId,
      officeName:    office.officeName,
      notes:         raw["Notes"] ?? "",
    };

    const parsed = bookingSchema.safeParse(candidate);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid row" };
    }

    const data: BookingFormData = {
      ...parsed.data,
      packageId:   parsed.data.packageId   || null,
      packageName: parsed.data.packageName || null,
      travelDate:  parsed.data.travelDate  || null,
      returnDate:  parsed.data.returnDate  || null,
      assignedTo:  parsed.data.assignedTo  || null,
      agentName:   parsed.data.agentName   || null,
      notes:       parsed.data.notes       || null,
      createdBy:   user?.uid ?? "",
    };

    return { data };
  }

  async function onImportRows(rows: BookingFormData[]): Promise<{ created: number; failed: number }> {
    let created = 0;
    let failed = 0;
    for (const row of rows) {
      const { error } = await addBooking(row);
      if (error) failed++;
      else created++;
    }
    return { created, failed };
  }

  async function handleSubmit(data: BookingSchema) {
    const payload = {
      ...data,
      packageId:   data.packageId   || null,
      packageName: data.packageName || null,
      travelDate:  data.travelDate  || null,
      returnDate:  data.returnDate  || null,
      assignedTo:  data.assignedTo  || null,
      agentName:   data.agentName   || null,
      notes:       data.notes       || null,
      createdBy:   user?.uid ?? "",
    };

    if (editingBooking) {
      await editBooking(editingBooking.id, payload);
    } else {
      await addBooking(payload);
    }
    setFormOpen(false);
    setEditingBooking(null);
  }

  function handleEdit(booking: Booking) {
    setViewingBooking(null);
    setEditingBooking(booking);
    setFormOpen(true);
  }

  async function handleDelete(booking: Booking) {
    if (!confirm(`Delete booking "${booking.refNumber}"? This cannot be undone.`)) return;
    setViewingBooking(null);
    await removeBooking(booking.id);
  }

  return (
    <div className="space-y-5">

      <PageHeader
        title="Bookings"
        description={`${bookings.length} total booking${bookings.length !== 1 ? "s" : ""}`}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>
              Refresh
            </Button>
            <BulkExportButton filenameBase="bookings" rows={exportRows} />
            {canCreate && (
              <Button variant="outline" size="sm" icon={<UploadCloud size={14} />} onClick={() => setImportOpen(true)}>
                Import
              </Button>
            )}
            {canCreate && (
              <Button
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => { setEditingBooking(null); setFormOpen(true); }}
              >
                New Booking
              </Button>
            )}
          </>
        }
      />

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Bookings", value: stats.total,                    icon: Briefcase,    color: "text-primary"    },
          { label: "Pending",        value: stats.pending,                  icon: Clock,        color: "text-amber-600"  },
          { label: "Confirmed",      value: stats.confirmed,                icon: CheckCircle2, color: "text-green-600"  },
          { label: "Amount Due",     value: formatAmount(stats.dueAmount),  icon: Wallet,       color: "text-red-600"    },
        ].map(s => (
          <div key={s.label} className="fluid-card rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <s.icon size={18} className="text-primary" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              "flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
              statusFilter === f.value
                ? "bg-primary text-white shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by customer, phone, destination, ref..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-input bg-card pl-9 pr-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table */}
      <BookingsTable
        bookings={filtered}
        loading={loading}
        canManage={canManage}
        canApprove={canApprove}
        onView={setViewingBooking}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatus={(booking, status) => changeStatus(booking.id, status)}
      />

      {/* Detail popup */}
      <BookingDetailModal
        booking={viewingBooking ? filtered.find(b => b.id === viewingBooking.id) ?? viewingBooking : null}
        canManage={canManage}
        canApprove={canApprove}
        onClose={() => setViewingBooking(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatus={(booking, status) => changeStatus(booking.id, status)}
      />

      {/* Form drawer */}
      <BookingForm
        open={formOpen}
        booking={editingBooking}
        onClose={() => { setFormOpen(false); setEditingBooking(null); }}
        onSubmit={handleSubmit}
      />

      {/* Bulk import */}
      <BulkImportModal<BookingFormData>
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Bookings"
        description="Upload a .csv or .xlsx file to create many bookings at once"
        templateColumns={BOOKING_TEMPLATE_COLUMNS}
        onParseRow={onParseRow}
        onImport={onImportRows}
      />

    </div>
  );
}
