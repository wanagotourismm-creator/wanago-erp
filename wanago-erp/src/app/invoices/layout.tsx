import { AppShell } from "@/components/layout/AppShell";

export default function InvoicesLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="invoices">{children}</AppShell>;
}
