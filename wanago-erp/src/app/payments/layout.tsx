import { AppShell } from "@/components/layout/AppShell";

export default function PaymentsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="payments">{children}</AppShell>;
}
