import { AppShell } from "@/components/layout/AppShell";

export default function WhatsAppInboxLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredPage="whatsapp-inbox">{children}</AppShell>;
}
