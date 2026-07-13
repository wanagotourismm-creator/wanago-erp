import { z } from "zod";

export const fieldConditionSchema = z.object({
  fieldId:  z.string().min(1),
  operator: z.enum(["equals", "not_equals", "contains"]),
  value:    z.string(),
});

export const formFieldSchema = z.object({
  id:          z.string(),
  type: z.enum([
    "short_text", "long_text", "number", "dropdown",
    "multiple_choice", "checkboxes", "date", "file", "rating",
  ]),
  label:       z.string().min(1, "Question text is required"),
  placeholder: z.string().optional().or(z.literal("")),
  required:    z.boolean().default(false),
  options:     z.array(z.string()).default([]),
  condition:   fieldConditionSchema.nullable().default(null),
});

export const formLeadMappingSchema = z.object({
  nameFieldId:  z.string().nullable().default(null),
  emailFieldId: z.string().nullable().default(null),
  phoneFieldId: z.string().nullable().default(null),
  notesFieldId: z.string().nullable().default(null),
});

export const formActionsSchema = z.object({
  notifyUserId:   z.string().nullable().default(null),
  notifyUserName: z.string().nullable().default(null),
  createLead:     z.boolean().default(false),
  leadMapping:    formLeadMappingSchema.default({
    nameFieldId: null, emailFieldId: null, phoneFieldId: null, notesFieldId: null,
  }),
});

export const formSchema = z.object({
  title:       z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional().or(z.literal("")),
  fields:      z.array(formFieldSchema).default([]),
  visibility:  z.enum(["internal", "public"]).default("internal"),
  formStatus:  z.enum(["draft", "published", "closed"]).default("draft"),
  officeId:    z.string().min(1),
  officeName:  z.string().min(1),
  actions:     formActionsSchema.default({
    notifyUserId: null, notifyUserName: null, createLead: false,
    leadMapping: { nameFieldId: null, emailFieldId: null, phoneFieldId: null, notesFieldId: null },
  }),
});

export type FormFieldSchema = z.infer<typeof formFieldSchema>;
export type FormSchema = z.infer<typeof formSchema>;
