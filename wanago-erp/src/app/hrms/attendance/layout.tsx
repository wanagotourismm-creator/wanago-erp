import { AppShell } from "@/components/layout/AppShell";

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="hrms-attendance">{children}</AppShell>;
}
