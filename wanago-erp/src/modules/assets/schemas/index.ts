import { z } from "zod";

export const assetSchema = z.object({
  name:           z.string().min(1, "Name is required"),
  category:       z.string().min(1, "Category is required"),
  serialNumber:   z.string().optional().or(z.literal("")),
  condition:      z.enum(["good", "fair", "damaged"]),
  assignedToId:   z.string().optional().or(z.literal("")),
  assignedToName: z.string().optional().or(z.literal("")),
  officeId:       z.string().min(1),
});

export type AssetSchema = z.infer<typeof assetSchema>;

export const assetRequestSchema = z.object({
  employeeId:    z.string().min(1),
  employeeName:  z.string().min(1),
  assetCategory: z.string().min(1, "Category is required"),
  reason:        z.string().min(3, "Reason is required"),
  officeId:      z.string().min(1),
});

export type AssetRequestSchema = z.infer<typeof assetRequestSchema>;

export const essAssetRequestSchema = z.object({
  assetCategory: z.string().min(1, "Category is required"),
  reason:        z.string().min(3, "Reason is required"),
});

export type EssAssetRequestSchema = z.infer<typeof essAssetRequestSchema>;
