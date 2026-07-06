import { AppShell } from "@/components/layout/AppShell";

export default function PackagesLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="packages">{children}</AppShell>;
}
