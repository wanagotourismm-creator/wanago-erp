"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Sparkles, Mail, MessageCircle, CheckCircle2, Circle } from "lucide-react";
import { fetchReferralPosters } from "@/modules/referrals/services/referral-poster.service";
import { draftReferralCaption } from "@/modules/referrals/services/referral-caption-ai.service";
import { sendBulkKitEmails } from "@/modules/referrals/services/referral-bulk-email.service";
import { buildWhatsAppLink, cn } from "@/lib/utils/helpers";
import { getAppUrl } from "@/lib/app-url";
import { useCompanySettings } from "@/modules/admin/settings/hooks/useCompanySettings";
import type { ReferralPoster, ReferralPartner } from "@/modules/referrals/types";

type Props = {
  open: boolean;
  partners: ReferralPartner[]; // pre-filtered to the selected ones
  onClose: () => void;
};

function trackingLink(code: string): string {
  return `${getAppUrl()}/r/${code}`;
}

export function BulkKitModal({ open, partners, onClose }: Props) {
  const [posters, setPosters] = useState<ReferralPoster[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<{ sent: number; failed: number } | null>(null);
  const [whatsappSent, setWhatsappSent] = useState<Set<string>>(new Set());
  const { settings: company } = useCompanySettings();

  useEffect(() => {
    if (!open) return;
    setSelectedId(null);
    setCaption("");
    setEmailResult(null);
    setWhatsappSent(new Set());
    fetchReferralPosters(true).then(setPosters);
  }, [open]);

  const selected = posters.find(p => p.id === selectedId) ?? null;

  useEffect(() => {
    if (selected) setCaption(selected.captionTemplate);
  }, [selected]);

  async function handleAiDraft() {
    if (!selected) return;
    setDrafting(true);
    const result = await draftReferralCaption(selected.title, selected.destination);
    if (!("error" in result)) setCaption(result.text.trim());
    setDrafting(false);
  }

  const withEmail = partners.filter(p => !!p.email);

  async function handleSendAllEmail() {
    if (!selected || withEmail.length === 0) return;
    setEmailSending(true);
    setEmailResult(null);
    const result = await sendBulkKitEmails(
      withEmail.map(p => ({
        email: p.email as string,
        subject: `Your ${company.businessName} referral kit`,
        body: `${caption}\n\n${selected.imageUrl}\n\n${trackingLink(p.referralCode)}`,
      }))
    );
    setEmailResult(result);
    setEmailSending(false);
  }

  function markWhatsappSent(id: string) {
    setWhatsappSent(prev => new Set(prev).add(id));
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-enter relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Bulk Send Kit</h2>
            <p className="text-xs text-muted-foreground">To {partners.length} selected executive{partners.length === 1 ? "" : "s"}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Choose a poster</label>
            <div className="grid grid-cols-4 gap-2">
              {posters.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={cn("overflow-hidden rounded-xl border-2 transition-all", selectedId === p.id ? "border-primary" : "border-border hover:border-primary/40")}
                >
                  <img src={p.imageUrl} alt={p.title} className="h-14 w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {selected && (
            <>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Caption (used for everyone, link is personalized per person)</label>
                  <button onClick={handleAiDraft} disabled={drafting} className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline disabled:opacity-60">
                    {drafting ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />} AI Draft
                  </button>
                </div>
                <textarea rows={3} value={caption} onChange={(e) => setCaption(e.target.value)}
                  className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary transition-colors" />
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground"><Mail size={13} /> Email — sends automatically to all {withEmail.length} with an email on file</p>
                <button
                  onClick={handleSendAllEmail}
                  disabled={emailSending || withEmail.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {emailSending && <Loader2 size={13} className="animate-spin" />}
                  Send to All ({withEmail.length})
                </button>
                {emailResult && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {emailResult.sent} sent{emailResult.failed > 0 ? `, ${emailResult.failed} failed` : ""}.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground"><MessageCircle size={13} /> WhatsApp — opens one at a time (WhatsApp doesn&apos;t allow no-click bulk sending)</p>
                <div className="space-y-1.5">
                  {partners.map((p) => {
                    const done = whatsappSent.has(p.id);
                    const message = `${caption}\n\n${selected.imageUrl}\n\n${trackingLink(p.referralCode)}`;
                    return (
                      <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs">
                        <span className="flex items-center gap-1.5 font-medium text-foreground">
                          {done ? <CheckCircle2 size={13} className="text-green-600" /> : <Circle size={13} className="text-muted-foreground" />}
                          {p.fullName}
                        </span>
                        <a
                          href={buildWhatsAppLink(p.phone, message)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => markWhatsappSent(p.id)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
                            done ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"
                          )}
                        >
                          {done ? "Sent" : "Open"}
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
