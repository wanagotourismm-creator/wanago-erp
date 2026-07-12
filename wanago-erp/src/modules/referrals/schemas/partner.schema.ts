import { z } from "zod";

export const referralPartnerSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  phone:    z.string().min(1, "Phone is required"),
  email:    z.string().email().optional().or(z.literal("")),

  payoutMethod: z.enum(["upi", "bank"]),
  upiId:             z.string().optional().or(z.literal("")),
  bankAccountName:   z.string().optional().or(z.literal("")),
  bankAccountNumber: z.string().optional().or(z.literal("")),
  bankIfscCode:      z.string().optional().or(z.literal("")),

  partnerStatus: z.enum(["active", "inactive"]).default("active"),
  notes: z.string().optional().or(z.literal("")),
});

export type ReferralPartnerSchema = z.infer<typeof referralPartnerSchema>;
