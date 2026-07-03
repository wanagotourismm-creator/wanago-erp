import { AppShell } from "@/components/layout/AppShell";
export default function HRMSLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="hrms">{children}</AppShell>;
}
