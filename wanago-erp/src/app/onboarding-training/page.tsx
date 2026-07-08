import type { Metadata } from "next";
import { OnboardingTrainingAdminPage } from "@/modules/onboarding-training/pages/OnboardingTrainingAdminPage";

export const metadata: Metadata = { title: "Onboarding Training" };

export default function Page() {
  return <OnboardingTrainingAdminPage />;
}
