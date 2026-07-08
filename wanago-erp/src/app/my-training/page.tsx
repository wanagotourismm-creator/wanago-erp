import type { Metadata } from "next";
import { MyTrainingPage } from "@/modules/onboarding-training/pages/MyTrainingPage";

export const metadata: Metadata = { title: "My Training" };

export default function Page() {
  return <MyTrainingPage />;
}
