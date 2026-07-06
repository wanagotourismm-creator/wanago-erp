import type { Metadata } from "next";
import { ExpensesPage } from "@/modules/expenses/pages/ExpensesPage";

export const metadata: Metadata = { title: "Expenses" };

export default function Page() {
  return <ExpensesPage />;
}
