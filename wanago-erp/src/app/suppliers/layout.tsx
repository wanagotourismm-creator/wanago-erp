import { AppShell } from "@/components/layout/AppShell";
export default function SuppliersLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="suppliers">{children}</AppShell>;
}
