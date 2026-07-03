import type { Metadata } from "next";
import { AttendancePage } from "@/modules/hrms/attendance/pages/AttendancePage";

export const metadata: Metadata = { title: "Attendance" };

export default function Page() {
  return <AttendancePage />;
}
