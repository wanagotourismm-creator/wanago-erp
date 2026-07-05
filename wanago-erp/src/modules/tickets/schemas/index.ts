import { z } from "zod";

export const ticketSchema = z.object({
  title:          z.string().min(3, "Title is required"),
  description:    z.string().min(3, "Description is required"),
  category:       z.string().min(1, "Category is required"),
  priority:       z.enum(["low", "medium", "high", "urgent"]),
  reportedById:   z.string().min(1),
  reportedByName: z.string().min(1),
  officeId:       z.string().min(1),
});

export type TicketSchema = z.infer<typeof ticketSchema>;

export const essTicketReportSchema = z.object({
  title:       z.string().min(3, "Title is required"),
  description: z.string().min(3, "Description is required"),
  category:    z.string().min(1, "Category is required"),
  priority:    z.enum(["low", "medium", "high", "urgent"]),
});

export type EssTicketReportSchema = z.infer<typeof essTicketReportSchema>;
