import { AppShell } from "@/components/layout/AppShell";

export default function ReferralProgramLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="referral-program">{children}</AppShell>;
}
