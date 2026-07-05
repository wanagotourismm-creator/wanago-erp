import { AppShell } from "@/components/layout/AppShell";

export default function TrainingLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="training">{children}</AppShell>;
}
