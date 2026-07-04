import type { Metadata } from "next";
import { EmployeesPage } from "@/modules/hrms/employees/pages/EmployeesPage";

export const metadata: Metadata = { title: "Employees" };

export default function Page() {
  return <EmployeesPage />;
}
