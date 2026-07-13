import type { Metadata } from "next";
import { IntakePage } from "@/modules/intake/pages/IntakePage";

export const metadata: Metadata = { title: "Intake" };

export default function Page() {
  return <IntakePage />;
}
