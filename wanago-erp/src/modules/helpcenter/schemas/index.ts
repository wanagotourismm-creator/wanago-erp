import { z } from "zod";

export const helpArticleSchema = z.object({
  title:       z.string().min(3, "Title must be at least 3 characters"),
  category:    z.string().min(1, "Category is required"),
  content:     z.string().min(10, "Content must be at least 10 characters"),
  keywords:    z.array(z.string()).default([]),
  lastUpdated: z.string().min(1, "Date is required"),
});

export type HelpArticleSchema = z.infer<typeof helpArticleSchema>;
