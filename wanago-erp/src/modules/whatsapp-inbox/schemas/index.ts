import { z } from "zod";

export const whatsappReplySchema = z.object({
  body: z.string().trim().min(1, "Message can't be empty").max(4096),
});

export type WhatsAppReplySchema = z.infer<typeof whatsappReplySchema>;
