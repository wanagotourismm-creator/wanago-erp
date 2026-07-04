import type { FirestoreRecord } from "@/types/global";

export type Holiday = FirestoreRecord & {
  name:     string;
  date:     string;
  officeId: string | null;
};

export type HolidayFormData = Omit<
  Holiday,
  "id" | "createdAt" | "updatedAt" | "status"
>;
