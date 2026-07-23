import { AppShell } from "@/components/layout/AppShell";

export default function VendorRatesLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="vendor-rates">{children}</AppShell>;
}
