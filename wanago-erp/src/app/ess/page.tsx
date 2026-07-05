import type { Metadata } from "next";
import { EssPage } from "@/modules/ess/pages/EssPage";

export const metadata: Metadata = { title: "My Space" };

export default function Page() {
  return <EssPage />;
}
