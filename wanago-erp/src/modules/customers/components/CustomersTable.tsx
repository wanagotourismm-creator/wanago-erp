"use client";

import { useState } from "react";
import { MoreHorizontal, Edit2, Trash2, Phone, Mail, MapPin, Calendar } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { formatDate, initials, formatCurrency } from "@/lib/utils/helpers";
import { cn } from "@/lib/utils/helpers";
import type { Customer } from "@/modules/customers/types";

type Props = {
  customers: Customer[];
  loading:   boolean;
  onEdit:    (c: Customer) => void;
  onDelete:  (c: Customer) => void;
};

export function CustomersTable({ customers, loading, onEdit, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  if (loading) return <SkeletonTable rows={6} />;

  if (customers.length === 0) {
    return (
      <EmptyState
        title="No customers yet"
        description="Add your first customer to get started"
        icon={<span className="text-2xl">👥</span>}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Customer", "Contact", "Location", "Bookings", "Revenue", "Joined", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {customers.map(c => (
              <tr key={c.id} className="hover:bg-muted/20 transition-colors group">

                {/* Customer */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {initials(c.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">{c.refNumber}</p>
                    </div>
                  </div>
                </td>

                {/* Contact */}
                <td className="px-4 py-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 text-xs text-foreground">
                      <Phone size={11} className="text-muted-foreground" /> {c.phone}
                    </div>
                    {c.email && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail size={11} /> {c.email}
                      </div>
                    )}
                  </div>
                </td>

                {/* Location */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin size={11} />
                    {[c.city, c.state, c.country].filter(Boolean).join(", ") || "—"}
                  </div>
                </td>

                {/* Bookings */}
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {c.totalBookings ?? 0}
                  </span>
                </td>

                {/* Revenue */}
                <td className="px-4 py-3">
                  <span className="text-xs font-semibold text-foreground">
                    {formatCurrency(c.totalRevenue ?? 0)}
                  </span>
                </td>

                {/* Joined */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                    <Calendar size={11} />
                    {formatDate(c.createdAt)}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === c.id ? null : c.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <MoreHorizontal size={15} />
                    </button>
                    {menuOpen === c.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                        <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-border bg-card shadow-lg py-1">
                          <button onClick={() => { onEdit(c); setMenuOpen(null); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                            <Edit2 size={13} /> Edit
                          </button>
                          <button onClick={() => { onDelete(c); setMenuOpen(null); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
