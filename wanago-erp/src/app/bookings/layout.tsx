import { AppShell } from "@/components/layout/AppShell";
export default function BookingsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="bookings">{children}</AppShell>;
}
