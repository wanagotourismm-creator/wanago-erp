import type { Metadata } from "next";
import { PerformancePage } from "@/modules/performance/pages/PerformancePage";

export const metadata: Metadata = { title: "Performance" };

export default function Page() {
  return <PerformancePage />;
}
