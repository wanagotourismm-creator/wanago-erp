"use client";

import { X, Phone, Mail, MapPin, Edit2, Trash2, User } from "lucide-react";
import { CustomerTypeBadge } from "@/modules/customers/components/CustomerBadges";
import { formatDate, initials } from "@/lib/utils/helpers";
import type { Customer } from "@/modules/customers/types";

type Props = {
  customer:  Customer | null;
  canManage: boolean;
  onClose:   () => void;
  onEdit:    (customer: Customer) => void;
  onDelete:  (customer: Customer) => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value ?? "—"}</span>
    </div>
  );
}

export function CustomerDetailModal({ customer, canManage, onClose, onEdit, onDelete }: Props) {
  if (!customer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="modal-enter relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {initials(customer.fullName)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{customer.fullName}</h2>
              <p className="text-xs text-muted-foreground">{customer.refNumber} · Added {formatDate(customer.createdAt)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">

          <div className="flex flex-wrap items-center gap-2">
            <CustomerTypeBadge type={customer.customerType} />
            {customer.source && (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {customer.source}
              </span>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <User size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Contact</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="Phone" value={<span className="inline-flex items-center gap-1.5"><Phone size={12} />{customer.phone}</span>} />
              {customer.alternatePhone && <Row label="Alternate Phone" value={customer.alternatePhone} />}
              {customer.email && <Row label="Email" value={<span className="inline-flex items-center gap-1.5"><Mail size={12} />{customer.email}</span>} />}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <MapPin size={13} className="text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Location</p>
            </div>
            <div className="divide-y divide-border rounded-xl border border-border px-3">
              <Row label="City" value={customer.city} />
              <Row label="Address" value={customer.address} />
              <Row label="Office" value={customer.officeName} />
            </div>
          </div>

          {customer.notes && (
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-primary">Notes</p>
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {customer.notes}
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        {canManage && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-primary/15 bg-muted/30 px-6 py-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(customer)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
              >
                <Edit2 size={13} /> Edit
              </button>
              <button
                onClick={() => onDelete(customer)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
