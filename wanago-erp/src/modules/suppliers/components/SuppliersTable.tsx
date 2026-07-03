"use client";
import { useState } from "react";
import { MoreHorizontal, Edit2, Trash2, Phone, Mail, Star } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { initials } from "@/lib/utils/helpers";
import type { Supplier } from "@/modules/suppliers/types";

const CATEGORY_ICONS: Record<string, string> = { hotel:"🏨", airline:"✈️", transport:"🚌", cruise:"🚢", visa:"📄", insurance:"🛡️", activity:"🎯", restaurant:"🍽️", other:"📦" };

type Props = { suppliers: Supplier[]; loading: boolean; onEdit: (s: Supplier) => void; onDelete: (s: Supplier) => void; };

export function SuppliersTable({ suppliers, loading, onEdit, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  if (loading) return <SkeletonTable rows={6} />;
  if (suppliers.length === 0) return <EmptyState title="No suppliers yet" description="Add your first supplier to get started" icon={<span className="text-2xl">🏢</span>} />;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/30">{["Supplier","Category","Contact","Location","Rating",""].map(h => <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">
            {suppliers.map(s => (
              <tr key={s.id} className="hover:bg-muted/20 transition-colors group">
                <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{initials(s.name)}</div><div><p className="font-semibold text-foreground">{s.name}</p><p className="text-[11px] text-muted-foreground">{s.refNumber}</p></div></div></td>
                <td className="px-4 py-3"><span className="text-xs">{CATEGORY_ICONS[s.category]} {s.category.charAt(0).toUpperCase()+s.category.slice(1)}</span></td>
                <td className="px-4 py-3"><div className="flex items-center gap-1 text-xs text-foreground"><Phone size={11} className="text-muted-foreground" />{s.phone}</div>{s.email && <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5"><Mail size={11} />{s.email}</div>}</td>
                <td className="px-4 py-3"><span className="text-xs text-muted-foreground">{[s.city, s.country].filter(Boolean).join(", ")}</span></td>
                <td className="px-4 py-3"><div className="flex items-center gap-1">{Array.from({length:5}).map((_,i) => <Star key={i} size={11} className={i < s.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"} />)}</div></td>
                <td className="px-4 py-3"><div className="relative"><button onClick={() => setMenuOpen(menuOpen === s.id ? null : s.id)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-all"><MoreHorizontal size={15} /></button>
                  {menuOpen === s.id && (<><div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} /><div className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-border bg-card shadow-lg py-1"><button onClick={() => { onEdit(s); setMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"><Edit2 size={13} /> Edit</button><button onClick={() => { onDelete(s); setMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"><Trash2 size={13} /> Delete</button></div></>)}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
