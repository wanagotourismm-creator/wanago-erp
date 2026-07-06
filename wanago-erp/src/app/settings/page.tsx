import type { Metadata } from "next";
import { AccountSettingsPage } from "@/modules/account/pages/AccountSettingsPage";

export const metadata: Metadata = {
  title: "My Account",
};

export default function Page() {
  return <AccountSettingsPage />;
}
