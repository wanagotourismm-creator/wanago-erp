import { AppShell } from "@/components/layout/AppShell";

const HR_ADMIN_PAGES = [
  "hrms-overview", "hrms-employees", "hrms-attendance", "hrms-leaves",
  "hrms-payroll", "recruitment", "performance", "training",
];

export default function HrAdminLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage={HR_ADMIN_PAGES} fullBleed>{children}</AppShell>;
}
