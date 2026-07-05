import type { FieldValue } from "firebase/firestore";
import type { FirestoreRecord, Timestamp } from "@/types/global";

export type AssetCondition = "good" | "fair" | "damaged";

export type Asset = FirestoreRecord & {
  name:           string;
  category:       string;
  serialNumber:   string | null;
  condition:      AssetCondition;
  assignedToId:   string | null;
  assignedToName: string | null;
  assignedDate:   string | null;
  officeId:       string;
};

export type AssetFormData = Omit<Asset, "id" | "createdAt" | "updatedAt" | "status">;

export type AssetRequest = FirestoreRecord & {
  employeeId:    string;
  employeeName:  string;
  assetCategory: string;
  reason:        string;
  officeId:      string;
  requestStatus: "pending" | "approved" | "rejected";
  approvedBy:    string | null;
  approvedAt:    Timestamp | Date | string | FieldValue | null;
  rejectedBy:    string | null;
};

export const ASSET_CATEGORIES = ["Laptop", "Desktop", "ID Card", "SIM Card", "Phone", "Monitor", "Other"];
