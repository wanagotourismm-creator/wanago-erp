import type { FirestoreRecord } from "@/types/global";

export type FormFieldType =
  | "short_text" | "long_text" | "number" | "dropdown"
  | "multiple_choice" | "checkboxes" | "date" | "file" | "rating";

export type FormField = {
  id:           string; // client-generated, stable across edits/reorders — answers key off this, not array index
  type:         FormFieldType;
  label:        string;
  placeholder:  string | null;
  required:     boolean;
  options:      string[]; // dropdown / multiple_choice / checkboxes only
};

export type FormVisibility = "internal" | "public";
export type FormLifecycleStatus = "draft" | "published" | "closed";

export type Form = FirestoreRecord & {
  title:            string;
  description:      string | null;
  fields:           FormField[];
  visibility:       FormVisibility;
  formStatus:       FormLifecycleStatus;
  // Set the first time a form is published as Public — same long random
  // token pattern as Lead.bookingLinkToken, resolved with no login at
  // /f/{token}. Stays null for Internal forms (filled inside the dashboard,
  // gated by the normal auth boundary instead).
  shareToken:       string | null;
  officeId:         string;
  officeName:       string;
  refNumber:        string;
  // Denormalized so the list page can show a count without a query per row.
  responseCount:    number;
};

export type FormFormData = Omit<
  Form,
  "id" | "createdAt" | "updatedAt" | "status" | "refNumber" | "shareToken" | "responseCount"
>;

export type FormResponse = FirestoreRecord & {
  formId:            string;
  answers:           Record<string, string | string[] | number | null>;
  submittedByName:   string | null;
  submittedByUserId: string | null;
};

export type FormResponseFormData = Omit<FormResponse, "id" | "createdAt" | "updatedAt" | "status">;
