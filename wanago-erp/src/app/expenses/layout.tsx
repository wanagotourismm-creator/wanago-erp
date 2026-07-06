import { AppShell } from "@/components/layout/AppShell";

export default function ExpensesLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="expenses">{children}</AppShell>;
}
