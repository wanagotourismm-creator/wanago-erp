import { AppShell } from "@/components/layout/AppShell";

export default function OnboardingTrainingLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="onboarding-training">{children}</AppShell>;
}
