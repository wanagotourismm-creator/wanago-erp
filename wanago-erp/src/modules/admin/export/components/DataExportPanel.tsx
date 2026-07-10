"use client";

import { useState } from "react";
import { Download, Loader2, Users, UserCheck, CalendarCheck, FileText, CreditCard } from "lucide-react";
import { exportToCsv } from "@/lib/csv-export";
import { formatDate } from "@/lib/utils/helpers";
import { fetchLeads } from "@/modules/leads/services/lead.service";
import { fetchCustomers } from "@/modules/customers/services/customer.service";
import { fetchBookings } from "@/modules/bookings/services/booking.service";
import { fetchInvoices } from "@/modules/invoices/services/invoice.service";
import { fetchPayments } from "@/modules/payments/services/payment.service";

type Exporter = {
  key:         string;
  label:       string;
  description: string;
  icon:        React.ElementType;
  run:         () => Promise<void>;
};

export function DataExportPanel() {
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exporters: Exporter[] = [
    {
      key: "leads", label: "Leads", description: "All leads with contact and pipeline info",
      icon: Users,
      run: async () => {
        const data = await fetchLeads();
        exportToCsv("leads.csv", data.map(l => ({
          refNumber: l.refNumber, name: l.name, phone: l.phone, email: l.email ?? "",
          destination: l.destination, tripType: l.tripType, stage: l.stage, priority: l.priority,
          source: l.source, pax: l.pax, budget: l.budget ?? "", officeName: l.officeName,
          createdAt: formatDate(l.createdAt),
        })));
      },
    },
    {
      key: "customers", label: "Customers", description: "All customers with contact info",
      icon: UserCheck,
      run: async () => {
        const data = await fetchCustomers();
        exportToCsv("customers.csv", data.map(c => ({
          refNumber: c.refNumber, fullName: c.fullName, phone: c.phone, email: c.email ?? "",
          customerType: c.customerType, city: c.city ?? "", source: c.source, officeName: c.officeName,
          createdAt: formatDate(c.createdAt),
        })));
      },
    },
    {
      key: "bookings", label: "Bookings", description: "All bookings with trip and payment status",
      icon: CalendarCheck,
      run: async () => {
        const data = await fetchBookings();
        exportToCsv("bookings.csv", data.map(b => ({
          refNumber: b.refNumber, customerName: b.customerName, customerPhone: b.customerPhone,
          destination: b.destination, travelDate: b.travelDate ?? "", pax: b.pax,
          totalAmount: b.totalAmount, advanceAmount: b.advanceAmount, balanceAmount: b.balanceAmount,
          status: b.status, officeName: b.officeName, createdAt: formatDate(b.createdAt),
        })));
      },
    },
    {
      key: "invoices", label: "Invoices", description: "All invoices with balance and status",
      icon: FileText,
      run: async () => {
        const data = await fetchInvoices();
        exportToCsv("invoices.csv", data.map(i => ({
          refNumber: i.refNumber, customerName: i.customerName, bookingRef: i.bookingRef ?? "",
          totalAmount: i.totalAmount, amountPaid: i.amountPaid, balanceDue: i.balanceDue,
          status: i.status, issueDate: i.issueDate, dueDate: i.dueDate ?? "",
          createdAt: formatDate(i.createdAt),
        })));
      },
    },
    {
      key: "payments", label: "Payments", description: "All recorded payments",
      icon: CreditCard,
      run: async () => {
        const data = await fetchPayments();
        exportToCsv("payments.csv", data.map(p => ({
          refNumber: p.refNumber, customerName: p.customerName, invoiceRef: p.invoiceRef ?? "",
          amount: p.amount, paymentMethod: p.paymentMethod, paymentDate: p.paymentDate,
          referenceNumber: p.referenceNumber ?? "", createdAt: formatDate(p.createdAt),
        })));
      },
    },
  ];

  async function handleExport(exp: Exporter) {
    setRunning(exp.key);
    setError(null);
    try {
      await exp.run();
    } catch {
      setError(`Failed to export ${exp.label}`);
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-4">
    {error && (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
    )}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {exporters.map(exp => (
        <div key={exp.key} className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <exp.icon size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{exp.label}</p>
              <p className="text-[11px] text-muted-foreground">{exp.description}</p>
            </div>
          </div>
          <button
            onClick={() => handleExport(exp)}
            disabled={running === exp.key}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors disabled:opacity-60"
          >
            {running === exp.key ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Download CSV
          </button>
        </div>
      ))}
    </div>
    </div>
  );
}
