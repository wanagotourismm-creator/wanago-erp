import { AppShell } from "@/components/layout/AppShell";

export default function QuotationsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="quotations">{children}</AppShell>;
}
