import { AppShell } from "@/components/layout/AppShell";

export default function EmployeesLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="hrms-employees">{children}</AppShell>;
}
