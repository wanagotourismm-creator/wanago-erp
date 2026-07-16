import type { FirestoreRecord } from "@/types/global";

export type WhatsAppTemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";
export type WhatsAppTemplateApprovalStatus = "draft" | "pending_review" | "approved" | "rejected";

// Records a template that's been (or is being) submitted to Meta's
// WhatsApp Manager for approval — this app can't query Meta for approval
// state, so approvalStatus is a staff-maintained mirror of it. Business
// logic looks up "the approved template for purpose X" generically via
// `purpose`, never by hardcoding a Meta template name.
export type WhatsAppTemplate = FirestoreRecord & {
  purpose:          string;
  metaTemplateName: string;
  language:         string;
  category:         WhatsAppTemplateCategory;
  approvalStatus:   WhatsAppTemplateApprovalStatus;
  bodyPreview:      string;
  variables:        string[];
  isActive:         boolean;
  notes:            string | null;
};

export type WhatsAppTemplateFormData = Omit<
  WhatsAppTemplate,
  "id" | "createdAt" | "updatedAt" | "status" | "createdBy"
>;
