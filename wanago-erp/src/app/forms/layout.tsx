import { AppShell } from "@/components/layout/AppShell";

export default function FormsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="forms">{children}</AppShell>;
}
