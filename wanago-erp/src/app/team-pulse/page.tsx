import type { Metadata } from "next";
import { TeamPulsePage } from "@/modules/team-pulse/pages/TeamPulsePage";

export const metadata: Metadata = { title: "Team Pulse" };

export default function Page() {
  return <TeamPulsePage />;
}
