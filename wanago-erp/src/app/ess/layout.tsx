import { AppShell } from "@/components/layout/AppShell";

export default function EssLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="ess" fullBleed>{children}</AppShell>;
}
