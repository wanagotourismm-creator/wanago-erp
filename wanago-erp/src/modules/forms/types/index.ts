import type { FirestoreRecord } from "@/types/global";

export type FormFieldType =
  | "short_text" | "long_text" | "number" | "dropdown"
  | "multiple_choice" | "checkboxes" | "date" | "file" | "rating";

export type FieldConditionOperator = "equals" | "not_equals" | "contains";

// "Show this question only if [an earlier question]'s answer [operator]
// [value]" — fieldId always points at a question earlier in the same
// form's fields array (the builder only ever offers earlier questions as
// the trigger, so there's no forward-reference/cycle to worry about).
export type FieldCondition = {
  fieldId:  string;
  operator: FieldConditionOperator;
  value:    string;
};

export type FormField = {
  id:           string; // client-generated, stable across edits/reorders — answers key off this, not array index
  type:         FormFieldType;
  label:        string;
  placeholder:  string | null;
  required:     boolean;
  options:      string[]; // dropdown / multiple_choice / checkboxes only
  condition:    FieldCondition | null;
};

export type FormVisibility = "internal" | "public";
export type FormLifecycleStatus = "draft" | "published" | "closed";

// Which question's answer feeds each Lead field when "auto-create a Lead"
// is on — null means "leave that field blank/default", not "required".
export type FormLeadMapping = {
  nameFieldId:  string | null;
  emailFieldId: string | null;
  phoneFieldId: string | null;
  notesFieldId: string | null;
};

export type FormActions = {
  // In-app notification to a single staff member on every new response.
  notifyUserId:   string | null;
  notifyUserName: string | null;
  createLead:     boolean;
  leadMapping:    FormLeadMapping;
};

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
  actions:          FormActions;
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
