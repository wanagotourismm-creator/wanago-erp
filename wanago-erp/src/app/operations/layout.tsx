import { AppShell } from "@/components/layout/AppShell";

export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="operations">{children}</AppShell>;
}
