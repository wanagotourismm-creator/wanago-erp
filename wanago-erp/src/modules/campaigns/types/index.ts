import type { FirestoreRecord } from "@/types/global";

export type Campaign = FirestoreRecord & {
  name:            string;
  channel:         string;        // one of DEFAULT_LEAD_SOURCES, e.g. "Instagram"
  campaignType:    string;        // free text, e.g. Social Media/Print/Referral/Email
  startDate:       string;
  endDate:         string | null;
  budget:          number | null;
  officeId:        string;
  officeName:      string;
  notes:           string | null;
  refNumber:       string;
  campaignStatus:  "draft" | "active" | "paused" | "completed";
};

export type CampaignFormData = Omit<Campaign, "id" | "createdAt" | "updatedAt" | "status" | "refNumber">;
