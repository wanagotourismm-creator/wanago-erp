import { AppShell } from "@/components/layout/AppShell";

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="reviews">{children}</AppShell>;
}
