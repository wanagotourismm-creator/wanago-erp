import type { Metadata } from "next";
import { WhatsAppInboxPage } from "@/modules/whatsapp-inbox/pages/WhatsAppInboxPage";

export const metadata: Metadata = { title: "WhatsApp Inbox" };

export default function Page() {
  return <WhatsAppInboxPage />;
}
