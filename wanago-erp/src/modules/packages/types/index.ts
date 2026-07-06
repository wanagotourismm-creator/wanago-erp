import type { FirestoreRecord } from "@/types/global";

export type Package = FirestoreRecord & {
  title:         string;
  destination:   string;
  category:      string;           // free text, e.g. Honeymoon/Family/Adventure/Pilgrimage
  durationDays:  number;
  durationNights: number;
  basePrice:     number;
  inclusions:    string;
  exclusions:    string;
  validFrom:     string | null;
  validTo:       string | null;
  officeId:      string;
  officeName:    string;
  notes:         string | null;
  refNumber:     string;
  packageStatus: "active" | "inactive";
};

export type PackageFormData = Omit<Package, "id" | "createdAt" | "updatedAt" | "status" | "refNumber">;
