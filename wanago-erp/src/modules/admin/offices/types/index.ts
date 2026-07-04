import type { FirestoreRecord } from "@/types/global";

export type Office = FirestoreRecord & {
  name:         string;
  code:         string;
  address:      string | null;
  city:         string | null;
  phone:        string | null;
  isHeadOffice: boolean;
};

export type OfficeFormData = Omit<
  Office,
  "id" | "createdAt" | "updatedAt" | "status"
>;
