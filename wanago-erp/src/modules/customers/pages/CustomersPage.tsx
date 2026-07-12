"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Search, RefreshCw, Upload } from "lucide-react";
import { useCustomers } from "@/modules/customers/hooks/useCustomers";
import { CustomersTable } from "@/modules/customers/components/CustomersTable";
import { PullToRefresh } from "@/components/shared/PullToRefresh";
import { CustomerDetailModal } from "@/modules/customers/components/CustomerDetailModal";
import { CustomerForm } from "@/modules/customers/components/CustomerForm";
import { CUSTOMER_TYPES, CUSTOMER_SEGMENT_LABELS } from "@/modules/customers/components/CustomerBadges";
import { computeCustomerSegment, type CustomerSegment } from "@/modules/customers/utils/segment";
import { BOOKING_STATUS } from "@/lib/constants";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/rbac";
import { cn, toDate } from "@/lib/utils/helpers";
import { BulkImportModal, type TemplateColumn } from "@/components/bulk/BulkImportModal";
import { BulkExportButton } from "@/components/bulk/BulkExportButton";
import { resolveOffice } from "@/lib/bulk/resolveOffice";
import { fetchOffices } from "@/modules/admin/offices/services/office.service";
import { fetchBookings } from "@/modules/bookings/services/booking.service";
import { fetchInvoices } from "@/modules/invoices/services/invoice.service";
import { fetchQuotations } from "@/modules/quotations/services/quotation.service";
import { fetchLeads } from "@/modules/leads/services/lead.service";
import { findCustomerByReferralCode } from "@/modules/referrals/services/referral.service";
import type { Office } from "@/modules/admin/offices/types";
import { customerSchema } from "@/modules/customers/schemas";
import type { Customer, CustomerFormData } from "@/modules/customers/types";
import type { CustomerSchema } from "@/modules/customers/schemas";

const TYPE_FILTERS = [{ value: "", label: "All Customers" }, ...CUSTOMER_TYPES];

const CUSTOMER_TEMPLATE_COLUMNS: TemplateColumn[] = [
  { key: "fullName",       label: "Full Name",       required: true, example: "Priya Nair" },
  { key: "phone",          label: "Phone",           required: true, example: "+91 98765 43210" },
  { key: "customerType",   label: "Customer Type",   required: true, example: "individual" },
  { key: "source",         label: "Source",          required: true, example: "Referral" },
  { key: "email",          label: "Email",           example: "priya@example.com" },
  { key: "alternatePhone", label: "Alternate Phone", example: "" },
  { key: "city",           label: "City",            example: "Mumbai" },
  { key: "address",        label: "Address",         example: "" },
  { key: "officeName",     label: "Office",          example: "Head Office" },
  { key: "notes",          label: "Notes",           example: "" },
];

export function CustomersPage() {
  const { customers, loading, addCustomer, editCustomer, removeCustomer, load } = useCustomers();
  const { user } = useAuthStore();
  const canManage = !!user && hasPermission(user.systemRole, "customers:edit");
  const canCreate = !!user && hasPermission(user.systemRole, "customers:create");
  const searchParams = useSearchParams();
  const router = useRouter();

  const [formOpen,        setFormOpen]        = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [typeFilter,      setTypeFilter]      = useState("");
  const [search,          setSearch]          = useState("");
  const [importOpen,      setImportOpen]      = useState(false);
  const [offices,         setOffices]         = useState<Office[]>([]);
  const [segmentFilter,   setSegmentFilter]   = useState<CustomerSegment | "">("");
  const [segments,        setSegments]        = useState<Record<string, CustomerSegment>>({});

  useEffect(() => { fetchOffices().then(setOffices).catch(() => {}); }, []);

  // Segments every customer using the shared computeCustomerSegment rule —
  // enquiry count from matched Leads, booking count/value/recency from
  // Bookings. Recomputed whenever the customer list changes so a brand new
  // customer isn't stuck showing as unsegmented.
  useEffect(() => {
    if (customers.length === 0) return;
    Promise.all([fetchLeads(), fetchBookings()]).then(([leads, bookings]) => {
      const enquiryCounts: Record<string, number> = {};
      const lastEnquiryAt: Record<string, Date> = {};
      for (const lead of leads) {
        if (!lead.matchedCustomerId) continue;
        enquiryCounts[lead.matchedCustomerId] = (enquiryCounts[lead.matchedCustomerId] ?? 0) + 1;
        const created = toDate(lead.createdAt);
        if (created && (!lastEnquiryAt[lead.matchedCustomerId] || created > lastEnquiryAt[lead.matchedCustomerId])) {
          lastEnquiryAt[lead.matchedCustomerId] = created;
        }
      }

      const bookingCounts: Record<string, number> = {};
      const bookingValues: Record<string, number> = {};
      const lastBookingAt: Record<string, Date> = {};
      for (const booking of bookings) {
        const created = toDate(booking.createdAt);
        if (created && (!lastBookingAt[booking.customerId] || created > lastBookingAt[booking.customerId])) {
          lastBookingAt[booking.customerId] = created;
        }
        if (booking.status === BOOKING_STATUS.CONFIRMED || booking.status === BOOKING_STATUS.COMPLETED) {
          bookingCounts[booking.customerId] = (bookingCounts[booking.customerId] ?? 0) + 1;
          bookingValues[booking.customerId] = (bookingValues[booking.customerId] ?? 0) + booking.totalAmount;
        }
      }

      const nextSegments: Record<string, CustomerSegment> = {};
      for (const customer of customers) {
        const lastActivityAt = [lastEnquiryAt[customer.id], lastBookingAt[customer.id]]
          .filter((d): d is Date => !!d)
          .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
        nextSegments[customer.id] = computeCustomerSegment({
          enquiryCount:      enquiryCounts[customer.id] ?? 0,
          bookingCount:      bookingCounts[customer.id] ?? 0,
          totalBookingValue: bookingValues[customer.id] ?? 0,
          lastActivityAt,
        });
      }
      setSegments(nextSegments);
    }).catch(() => {});
  }, [customers]);

  // Supports deep-linking straight into a customer's detail view, e.g.
  // from Global Search (/customers?view=<id>).
  useEffect(() => {
    const viewId = searchParams.get("view");
    if (!viewId || customers.length === 0) return;
    const match = customers.find((c) => c.id === viewId);
    if (match) setViewingCustomer(match);
    router.replace("/customers");
  }, [searchParams, customers, router]);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const matchType    = !typeFilter || c.customerType === typeFilter;
      const matchSearch  = !search || [c.fullName, c.phone, c.email ?? "", c.city ?? ""]
        .some(f => f?.toLowerCase().includes(search.toLowerCase()));
      const matchSegment = !segmentFilter || segments[c.id] === segmentFilter;
      return matchType && matchSearch && matchSegment;
    });
  }, [customers, typeFilter, search, segmentFilter, segments]);

  const segmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(segments).forEach(s => { counts[s] = (counts[s] ?? 0) + 1; });
    return counts;
  }, [segments]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    customers.forEach(c => { counts[c.customerType] = (counts[c.customerType] ?? 0) + 1; });
    return counts;
  }, [customers]);

  const exportRows = useMemo(() => filtered.map((c) => ({
    "Full Name":       c.fullName,
    "Phone":           c.phone,
    "Customer Type":   c.customerType,
    "Source":          c.source,
    "Email":           c.email ?? "",
    "Alternate Phone": c.alternatePhone ?? "",
    "City":            c.city ?? "",
    "Address":         c.address ?? "",
    "Office":          c.officeName,
    "Notes":           c.notes ?? "",
  })), [filtered]);

  function onParseCustomerRow(raw: Record<string, string>): { data: CustomerFormData } | { error: string } {
    const office = resolveOffice(raw["Office"], offices, {
      officeId:   user?.officeId   ?? "",
      officeName: user?.officeName ?? "",
    });

    const candidate = {
      fullName:       raw["Full Name"]?.trim() ?? "",
      email:          raw["Email"]?.trim() ?? "",
      phone:          raw["Phone"]?.trim() ?? "",
      alternatePhone: raw["Alternate Phone"]?.trim() ?? "",
      customerType:   raw["Customer Type"]?.trim() || "individual",
      city:           raw["City"]?.trim() ?? "",
      address:        raw["Address"]?.trim() ?? "",
      source:         raw["Source"]?.trim() ?? "",
      officeId:       office.officeId,
      officeName:     office.officeName,
      notes:          raw["Notes"]?.trim() ?? "",
    };

    const check = customerSchema.safeParse(candidate);
    if (!check.success) return { error: check.error.issues[0]?.message ?? "Invalid row" };

    const d = check.data;
    const data: CustomerFormData = {
      fullName:       d.fullName,
      email:          d.email || null,
      phone:          d.phone,
      alternatePhone: d.alternatePhone || null,
      customerType:   d.customerType,
      city:           d.city || null,
      address:        d.address || null,
      source:         d.source,
      officeId:       d.officeId,
      officeName:     d.officeName,
      notes:          d.notes || null,
      createdBy:      user?.uid ?? "",
    };
    return { data };
  }

  async function onImportCustomers(rows: CustomerFormData[]): Promise<{ created: number; failed: number }> {
    let created = 0, failed = 0;
    for (const row of rows) {
      const { error } = await addCustomer(row);
      if (error) failed++; else created++;
    }
    return { created, failed };
  }

  async function handleSubmit(data: CustomerSchema) {
    const { referralCodeEntered, ...rest } = data;
    const referredByCustomer = referralCodeEntered
      ? await findCustomerByReferralCode(referralCodeEntered).catch(() => null)
      : null;

    const payload = {
      ...rest,
      email:          data.email          || null,
      alternatePhone: data.alternatePhone || null,
      city:           data.city           || null,
      address:        data.address        || null,
      notes:          data.notes          || null,
      createdBy:      user?.uid ?? "",
      status:         "active",
      refNumber:      editingCustomer?.refNumber ?? "",
      // The referral-code field is create-only (hidden on edit), so on an
      // edit this always resolves to null above — fall back to whatever
      // was already on the customer instead of silently wiping it out.
      referredByCustomerId: referredByCustomer?.id ?? editingCustomer?.referredByCustomerId ?? null,
    };

    if (editingCustomer) {
      await editCustomer(editingCustomer.id, payload);
    } else {
      await addCustomer(payload as never);
    }
    setFormOpen(false);
    setEditingCustomer(null);
  }

  function handleEdit(customer: Customer) {
    setViewingCustomer(null);
    setEditingCustomer(customer);
    setFormOpen(true);
  }

  async function handleDelete(customer: Customer) {
    // Previously this deleted with no idea whether the customer had any
    // history — bookings/invoices/quotations don't get cleaned up or
    // relinked, so any of those left behind would just silently point at
    // a customer that no longer exists. Warn with real counts instead.
    const [bookings, invoices, quotations] = await Promise.all([
      fetchBookings({ customerId: customer.id }),
      fetchInvoices().then(all => all.filter(i => i.customerId === customer.id)).catch(() => []),
      fetchQuotations().then(all => all.filter(q => q.customerId === customer.id)).catch(() => []),
    ]);
    const linked = [
      bookings.length   && `${bookings.length} booking${bookings.length === 1 ? "" : "s"}`,
      invoices.length   && `${invoices.length} invoice${invoices.length === 1 ? "" : "s"}`,
      quotations.length && `${quotations.length} quotation${quotations.length === 1 ? "" : "s"}`,
    ].filter(Boolean).join(", ");

    const message = linked
      ? `"${customer.fullName}" has ${linked} on record. Deleting the customer won't remove or relink those — they'll be left pointing at a customer that no longer exists. Delete anyway?`
      : `Delete customer "${customer.fullName}"? This cannot be undone.`;

    if (!confirm(message)) return;
    setViewingCustomer(null);
    await removeCustomer(customer.id);
  }

  return (
    <div className="space-y-5">

      <PageHeader
        title="Customers"
        tourId="tour-customers-header"
        description={`${customers.length} total customer${customers.length !== 1 ? "s" : ""} in your directory`}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>
              Refresh
            </Button>
            <Button variant="outline" size="sm" icon={<Upload size={14} />} onClick={() => setImportOpen(true)} data-tour-id="tour-customers-import">
              Import
            </Button>
            <BulkExportButton filenameBase="customers" rows={exportRows} />
            {canCreate && (
              <Button
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => { setEditingCustomer(null); setFormOpen(true); }}
                data-tour-id="tour-customers-add"
              >
                Add Customer
              </Button>
            )}
          </>
        }
      />

      {/* Type filter tabs */}
      <div data-tour-id="tour-customers-filters" className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setTypeFilter(f.value)}
            className={cn(
              "flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
              typeFilter === f.value
                ? "bg-primary text-white shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            )}
          >
            {f.label}
            <span className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
              typeFilter === f.value ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
            )}>
              {f.value ? (typeCounts[f.value] ?? 0) : customers.length}
            </span>
          </button>
        ))}
        {(Object.entries(CUSTOMER_SEGMENT_LABELS) as [CustomerSegment, string][])
          .filter(([value]) => (segmentCounts[value] ?? 0) > 0)
          .map(([value, label]) => (
            <button
              key={value}
              onClick={() => setSegmentFilter((v) => (v === value ? "" : value))}
              className={cn(
                "flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
                segmentFilter === value
                  ? "bg-primary text-white shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              )}
            >
              {label}
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                segmentFilter === value ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              )}>
                {segmentCounts[value] ?? 0}
              </span>
            </button>
          ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name, phone, email, city..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-input bg-card pl-9 pr-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table */}
      <PullToRefresh onRefresh={load}>
        <CustomersTable
          customers={filtered}
          loading={loading}
          canManage={canManage}
          segments={segments}
          onView={setViewingCustomer}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </PullToRefresh>

      {/* Detail popup */}
      <CustomerDetailModal
        customer={viewingCustomer ? filtered.find(c => c.id === viewingCustomer.id) ?? viewingCustomer : null}
        canManage={canManage}
        onClose={() => setViewingCustomer(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Form drawer */}
      <CustomerForm
        open={formOpen}
        customer={editingCustomer}
        onClose={() => { setFormOpen(false); setEditingCustomer(null); }}
        onSubmit={handleSubmit}
      />

      {/* Bulk import */}
      <BulkImportModal<CustomerFormData>
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Customers"
        templateColumns={CUSTOMER_TEMPLATE_COLUMNS}
        onParseRow={onParseCustomerRow}
        onImport={onImportCustomers}
      />

    </div>
  );
}
