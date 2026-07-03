import type { Metadata } from "next";
import { SuppliersPage } from "@/modules/suppliers/pages/SuppliersPage";
export const metadata: Metadata = { title: "Suppliers" };
export default function Page() { return <SuppliersPage />; }
