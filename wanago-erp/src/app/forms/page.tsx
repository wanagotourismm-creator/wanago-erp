import type { Metadata } from "next";
import { FormsPage } from "@/modules/forms/pages/FormsPage";

export const metadata: Metadata = { title: "Forms" };

export default function Page() {
  return <FormsPage />;
}
