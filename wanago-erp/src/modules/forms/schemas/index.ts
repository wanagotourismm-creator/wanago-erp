import { z } from "zod";

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
});

export const formSchema = z.object({
  title:       z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional().or(z.literal("")),
  fields:      z.array(formFieldSchema).default([]),
  visibility:  z.enum(["internal", "public"]).default("internal"),
  formStatus:  z.enum(["draft", "published", "closed"]).default("draft"),
  officeId:    z.string().min(1),
  officeName:  z.string().min(1),
});

export type FormFieldSchema = z.infer<typeof formFieldSchema>;
export type FormSchema = z.infer<typeof formSchema>;
