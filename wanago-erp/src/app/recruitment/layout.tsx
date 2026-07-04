import { AppShell } from "@/components/layout/AppShell";

export default function RecruitmentLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="recruitment">{children}</AppShell>;
}
