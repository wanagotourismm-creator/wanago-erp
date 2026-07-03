import { z } from "zod";

export const channelSchema = z.object({
  name:        z.string().min(2, "Channel name required").max(30),
  description: z.string().max(140).optional().or(z.literal("")),
  type:        z.enum(["public", "announcement"]).default("public"),
  officeId:    z.string().min(1),
});

export type ChannelSchema = z.infer<typeof channelSchema>;

export const messageSchema = z.object({
  text: z.string().min(1, "Message cannot be empty").max(4000),
});

export type MessageSchema = z.infer<typeof messageSchema>;
