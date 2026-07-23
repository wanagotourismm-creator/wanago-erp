import { AppShell } from "@/components/layout/AppShell";

export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="resources">{children}</AppShell>;
}
