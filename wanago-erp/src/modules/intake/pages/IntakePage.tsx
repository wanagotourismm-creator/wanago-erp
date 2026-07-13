"use client";

import { useEffect, useState } from "react";
import { Inbox, MapPin, Luggage, Phone, CheckCircle2, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useAuthStore } from "@/store/auth.store";
import { cn, formatDate } from "@/lib/utils/helpers";
import {
  fetchBookingRequests, markBookingRequestStatus,
  fetchQuickInquiries, markQuickInquiryStatus, convertQuickInquiryToLead,
} from "@/modules/intake/services/intake.service";
import type { BookingRequest, QuickInquiry, IntakeStatus } from "@/modules/intake/types";

type Tab = "bookingRequests" | "quickInquiries";

function StatusBadge({ status }: { status: IntakeStatus }) {
  const styles: Record<IntakeStatus, string> = {
    new:       "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    contacted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    converted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };
  const labels: Record<IntakeStatus, string> = { new: "New", contacted: "Contacted", converted: "Converted" };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", styles[status])}>{labels[status]}</span>;
}

export function IntakePage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>("quickInquiries");

  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [quickInquiries, setQuickInquiries] = useState<QuickInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    Promise.all([fetchBookingRequests(), fetchQuickInquiries()])
      .then(([br, qi]) => { setBookingRequests(br); setQuickInquiries(qi); })
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleMarkBookingContacted(r: BookingRequest) {
    setBusyId(r.id);
    await markBookingRequestStatus(r.id, "contacted");
    setBookingRequests(prev => prev.map(x => x.id === r.id ? { ...x, requestStatus: "contacted" } : x));
    setBusyId(null);
  }

  async function handleMarkInquiryContacted(q: QuickInquiry) {
    setBusyId(q.id);
    await markQuickInquiryStatus(q.id, "contacted");
    setQuickInquiries(prev => prev.map(x => x.id === q.id ? { ...x, inquiryStatus: "contacted" } : x));
    setBusyId(null);
  }

  async function handleConvert(q: QuickInquiry) {
    setBusyId(q.id);
    await convertQuickInquiryToLead(q, user?.officeId ?? "main", user?.officeName ?? "Head Office", user?.uid ?? "");
    setQuickInquiries(prev => prev.map(x => x.id === q.id ? { ...x, inquiryStatus: "converted" } : x));
    setBusyId(null);
  }

  const newBookingCount = bookingRequests.filter(r => r.requestStatus === "new").length;
  const newInquiryCount = quickInquiries.filter(q => q.inquiryStatus === "new").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Intake"
        description="Booking requests and quick inquiries submitted through the customer portal and public forms"
      />

      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => setTab("quickInquiries")}
          className={cn(
            "inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
            tab === "quickInquiries" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <MapPin size={14} /> Quick Inquiries
          {newInquiryCount > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">{newInquiryCount}</span>}
        </button>
        <button
          onClick={() => setTab("bookingRequests")}
          className={cn(
            "inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
            tab === "bookingRequests" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Luggage size={14} /> Booking Requests
          {newBookingCount > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">{newBookingCount}</span>}
        </button>
      </div>

      {loading ? (
        <SkeletonTable rows={5} />
      ) : tab === "quickInquiries" ? (
        quickInquiries.length === 0 ? (
          <EmptyState icon={<Inbox size={22} />} title="No quick inquiries yet" description="They'll show up here as soon as someone submits the quick inquiry form." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Name", "Phone", "Area / Address", "Status", "Date", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {quickInquiries.map((q) => (
                    <tr key={q.id}>
                      <td className="px-4 py-3 font-medium text-foreground">{q.name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground"><span className="inline-flex items-center gap-1"><Phone size={11} />{q.phone}</span></td>
                      <td className="px-4 py-3 text-muted-foreground">{q.address}</td>
                      <td className="px-4 py-3"><StatusBadge status={q.inquiryStatus} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(q.createdAt)}</td>
                      <td className="px-4 py-3">
                        {q.inquiryStatus !== "converted" && (
                          <div className="flex items-center justify-end gap-1.5">
                            {q.inquiryStatus === "new" && (
                              <button
                                onClick={() => handleMarkInquiryContacted(q)}
                                disabled={busyId === q.id}
                                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors disabled:opacity-50"
                              >
                                <CheckCircle2 size={12} /> Contacted
                              </button>
                            )}
                            <button
                              onClick={() => handleConvert(q)}
                              disabled={busyId === q.id}
                              className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                              <UserPlus size={12} /> Convert to Lead
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        bookingRequests.length === 0 ? (
          <EmptyState icon={<Luggage size={22} />} title="No booking requests yet" description="They'll show up here when a customer requests a booking through their portal." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Customer", "Package", "Travel Date", "Pax", "Notes", "Status", "Date", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bookingRequests.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 font-medium text-foreground">{r.customerName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.packageName}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{r.travelDate ? formatDate(r.travelDate) : "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.pax ?? "—"}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-xs text-muted-foreground" title={r.notes ?? undefined}>{r.notes ?? "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.requestStatus} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(r.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        {r.requestStatus === "new" && (
                          <button
                            onClick={() => handleMarkBookingContacted(r)}
                            disabled={busyId === r.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 size={12} /> Contacted
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
