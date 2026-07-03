import type { Metadata } from "next";
import { BookingsPage } from "@/modules/bookings/pages/BookingsPage";
export const metadata: Metadata = { title: "Bookings" };
export default function Page() { return <BookingsPage />; }
