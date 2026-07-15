"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Search, RefreshCw, FileText, Send, CheckCircle2, ArrowRightLeft } from "lucide-react";
import { useQuotations } from "@/modules/quotations/hooks/useQuotations";
import { QuotationsTable } from "@/modules/quotations/components/QuotationsTable";
import { QuotationDetailModal } from "@/modules/quotations/components/QuotationDetailModal";
import { QuotationForm } from "@/modules/quotations/components/QuotationForm";
import { QUOTATION_STATUS_LABELS } from "@/modules/quotations/components/QuotationBadges";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth.store";
import { isAdminRole } from "@/lib/rbac";
import { cn } from "@/lib/utils/helpers";
import type { Quotation, QuotationFormData } from "@/modules/quotations/types";
import type { QuotationSchema } from "@/modules/quotations/schemas";

type QuotationPrefill = Partial<QuotationSchema>;

// Firestore rules: super_admin/admin/sales may create & update quotations,
// only admin (which includes super_admin) may delete them.
const MANAGE_ROLES = ["super_admin", "admin", "sales"];

const STATUS_FILTERS = [
  { value: "", label: "All" },
  ...Object.entries(QUOTATION_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

export function QuotationsPage() {
  const {
    quotations, loading, addQuotation, editQuotation, removeQuotation, convertToBooking, load,
    sendToCustomer, acceptQuotation, declineQuotation,
  } = useQuotations();
  const { user } = useAuthStore();
  const canManage = !!user && MANAGE_ROLES.includes(user.systemRole);
  const canDelete = !!user && isAdminRole(user.systemRole);
  const searchParams = useSearchParams();
  const router = useRouter();

  const [formOpen,          setFormOpen]          = useState(false);
  const [editingQuotation,  setEditingQuotation]  = useState<Quotation | null>(null);
  const [viewingQuotation,  setViewingQuotation]  = useState<Quotation | null>(null);
  const [statusFilter,      setStatusFilter]      = useState("");
  const [search,            setSearch]            = useState("");
  const [formPrefill,       setFormPrefill]       = useState<QuotationPrefill | undefined>(undefined);

  // Supports deep-linking straight into a quotation's detail view, e.g.
  // from Global Search (/quotations?view=<id>).
  useEffect(() => {
    const viewId = searchParams.get("view");
    if (!viewId || quotations.length === 0) return;
    const match = quotations.find((q) => q.id === viewId);
    if (match) setViewingQuotation(match);
    router.replace("/quotations");
  }, [searchParams, quotations, router]);

  // Supports jumping straight into a pre-filled "New Quotation" form for a
  // specific customer, e.g. from a Customer's detail view's "Create
  // Quotation" action (/quotations?newForCustomer=<id>&name=&phone=).
  useEffect(() => {
    const customerId = searchParams.get("newForCustomer");
    if (!customerId) return;
    setFormPrefill({
      customerId,
      customerName: searchParams.get("name")  ?? "",
      customerPhone: searchParams.get("phone") ?? "",
    });
    setEditingQuotation(null);
    setFormOpen(true);
    router.replace("/quotations");
  }, [searchParams, router]);

  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      const matchStatus = !statusFilter || q.status === statusFilter;
      const matchSearch = !search || [q.customerName, q.customerPhone, q.refNumber, q.destination]
        .some(f => f?.toLowerCase().includes(search.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [quotations, statusFilter, search]);

  const stats = useMemo(() => {
    const sent      = quotations.filter(q => q.status === "sent").length;
    const accepted  = quotations.filter(q => q.status === "accepted").length;
    const converted = quotations.filter(q => q.status === "converted").length;
    return { total: quotations.length, sent, accepted, converted };
  }, [quotations]);

  async function handleSubmit(data: QuotationSchema) {
    const payload: QuotationFormData = {
      ...data,
      packageId:   data.packageId   || null,
      packageName: data.packageName || null,
      validUntil:  data.validUntil  || null,
      notes:       data.notes       || null,
      taxRate:     data.taxRate     ?? null,
      createdBy:   user?.uid ?? "",
    };

    if (editingQuotation) {
      await editQuotation(editingQuotation.id, payload);
    } else {
      await addQuotation(payload);
    }
    setFormOpen(false);
    setEditingQuotation(null);
  }

  function handleEdit(quotation: Quotation) {
    setViewingQuotation(null);
    setEditingQuotation(quotation);
    setFormOpen(true);
  }

  async function handleDelete(quotation: Quotation) {
    if (!confirm(`Delete quotation "${quotation.refNumber}"? This cannot be undone.`)) return;
    setViewingQuotation(null);
    await removeQuotation(quotation.id);
  }

  async function handleConvert(quotation: Quotation) {
    if (!confirm(`Convert quotation "${quotation.refNumber}" into a booking?`)) return;
    await convertToBooking(quotation);
    setViewingQuotation(null);
  }

  async function handleSend(quotation: Quotation) {
    await sendToCustomer(quotation);
  }

  async function handleAccept(quotation: Quotation) {
    await acceptQuotation(quotation);
  }

  async function handleReject(quotation: Quotation) {
    await declineQuotation(quotation);
  }

  return (
    <div className="space-y-5">

      <PageHeader
        title="Quotations"
        tourId="tour-quotations-header"
        description={`${quotations.length} total quotation${quotations.length !== 1 ? "s" : ""}`}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={() => load()}>
              Refresh
            </Button>
            {canManage && (
              <Button
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => { setEditingQuotation(null); setFormPrefill(undefined); setFormOpen(true); }}
                data-tour-id="tour-quotations-add"
              >
                New Quotation
              </Button>
            )}
          </>
        }
      />

      {/* Stat tiles */}
      <div data-tour-id="tour-quotations-stats" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Quotations", value: stats.total,     icon: FileText,     color: "text-primary"   },
          { label: "Sent",             value: stats.sent,      icon: Send,         color: "text-blue-600"  },
          { label: "Accepted",         value: stats.accepted,  icon: CheckCircle2, color: "text-green-600" },
          { label: "Converted",        value: stats.converted, icon: ArrowRightLeft, color: "text-purple-600" },
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
      <div data-tour-id="tour-quotations-filters" className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
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
          placeholder="Search by customer, phone, ref number, destination..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-input bg-card pl-9 pr-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table */}
      <QuotationsTable
        quotations={filtered}
        loading={loading}
        canEdit={canManage}
        canDelete={canDelete}
        onView={setViewingQuotation}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Detail popup */}
      <QuotationDetailModal
        quotation={viewingQuotation ? filtered.find(q => q.id === viewingQuotation.id) ?? viewingQuotation : null}
        canEdit={canManage}
        canDelete={canDelete}
        onClose={() => setViewingQuotation(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onConvert={handleConvert}
        onSend={handleSend}
        onAccept={handleAccept}
        onReject={handleReject}
      />

      {/* Form drawer */}
      <QuotationForm
        open={formOpen}
        quotation={editingQuotation}
        prefill={formPrefill}
        onClose={() => { setFormOpen(false); setEditingQuotation(null); setFormPrefill(undefined); }}
        onSubmit={handleSubmit}
      />

    </div>
  );
}
