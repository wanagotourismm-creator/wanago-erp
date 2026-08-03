import type { Metadata } from "next";
import { TourOperationsDetailPage } from "@/modules/tour-operations/pages/TourOperationsDetailPage";

export const metadata: Metadata = { title: "Tour Operations" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TourOperationsDetailPage id={id} />;
}
