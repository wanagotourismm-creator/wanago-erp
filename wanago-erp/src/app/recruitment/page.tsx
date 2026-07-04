import type { Metadata } from "next";
import { RecruitmentPage } from "@/modules/recruitment/pages/RecruitmentPage";

export const metadata: Metadata = { title: "Recruitment" };

export default function Page() {
  return <RecruitmentPage />;
}
