import { AppShell } from "@/components/layout/AppShell";

export default function TallyExportLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="accounting-tally">{children}</AppShell>;
}
