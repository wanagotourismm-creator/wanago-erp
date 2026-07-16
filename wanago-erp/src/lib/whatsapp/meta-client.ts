import { getIntegrationSecret } from "@/lib/get-integration-secret";

export type SendWhatsAppResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

// Sends via Meta's WhatsApp Cloud API directly — no Twilio in the middle,
// so replies within a customer-initiated 24h session window are free (Meta
// doesn't charge for those; Twilio would have added its own markup on top
// of every message regardless). Outside that window Meta requires a
// pre-approved message template no matter which provider is used.
export async function sendWhatsAppMessage(to: string, body: string): Promise<SendWhatsAppResult> {
  const [accessToken, phoneNumberId] = await Promise.all([
    getIntegrationSecret("metaWhatsappAccessToken", "META_WHATSAPP_ACCESS_TOKEN"),
    getIntegrationSecret("metaWhatsappPhoneNumberId", "META_WHATSAPP_PHONE_NUMBER_ID"),
  ]);

  if (!accessToken || !phoneNumberId) {
    return { ok: false, error: "WhatsApp isn't set up yet — add your Meta WhatsApp keys in Admin → Integrations." };
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/^\+/, ""),
      type: "text",
      text: { body: body.slice(0, 4096), preview_url: false },
    }),
  });

  const json = await res.json().catch(() => ({}) as Record<string, unknown>);
  if (!res.ok) {
    const error = json as { error?: { message?: string } };
    return { ok: false, error: error.error?.message ?? "Failed to send WhatsApp message" };
  }
  const messages = (json as { messages?: { id: string }[] }).messages;
  return { ok: true, messageId: messages?.[0]?.id ?? "" };
}

// Business-initiated send for outside the 24h window — Meta requires a
// pre-approved template (registered in Admin → WhatsApp Templates, created/
// reviewed in Meta's own WhatsApp Manager) rather than free text. Only
// text-body variables are supported (no header/button components) — enough
// for every template this app currently sends.
export async function sendWhatsAppTemplate(
  to: string, templateName: string, languageCode: string, variables: string[] = []
): Promise<SendWhatsAppResult> {
  const [accessToken, phoneNumberId] = await Promise.all([
    getIntegrationSecret("metaWhatsappAccessToken", "META_WHATSAPP_ACCESS_TOKEN"),
    getIntegrationSecret("metaWhatsappPhoneNumberId", "META_WHATSAPP_PHONE_NUMBER_ID"),
  ]);

  if (!accessToken || !phoneNumberId) {
    return { ok: false, error: "WhatsApp isn't set up yet — add your Meta WhatsApp keys in Admin → Integrations." };
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/^\+/, ""),
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(variables.length > 0
          ? { components: [{ type: "body", parameters: variables.map((v) => ({ type: "text", text: v })) }] }
          : {}),
      },
    }),
  });

  const json = await res.json().catch(() => ({}) as Record<string, unknown>);
  if (!res.ok) {
    const error = json as { error?: { message?: string } };
    return { ok: false, error: error.error?.message ?? "Failed to send WhatsApp template message" };
  }
  const messages = (json as { messages?: { id: string }[] }).messages;
  return { ok: true, messageId: messages?.[0]?.id ?? "" };
}
