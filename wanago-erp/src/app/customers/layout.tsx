import { AppShell } from "@/components/layout/AppShell";

export default function CustomersLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="customers">{children}</AppShell>;
}
