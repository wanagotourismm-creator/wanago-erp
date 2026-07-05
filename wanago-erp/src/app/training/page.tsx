import type { Metadata } from "next";
import { TrainingPage } from "@/modules/training/pages/TrainingPage";

export const metadata: Metadata = { title: "Training" };

export default function Page() {
  return <TrainingPage />;
}
