"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Sparkles, MessageCircle, Mail, Copy, Check, ImageOff } from "lucide-react";
import { fetchReferralPosters } from "@/modules/referrals/services/referral-poster.service";
import { draftReferralCaption } from "@/modules/referrals/services/referral-caption-ai.service";
import { buildWhatsAppLink, cn } from "@/lib/utils/helpers";
import { getAppUrl } from "@/lib/app-url";
import { useCompanySettings } from "@/modules/admin/settings/hooks/useCompanySettings";
import type { ReferralPoster } from "@/modules/referrals/types";

type Props = {
  open: boolean;
  onClose: () => void;
  // The referrer this kit is being handed to — staff sends it TO this
  // person's own phone/email, and they re-share it onward from there (see
  // the module's design note: neither customers nor Freelance Referral
  // Executives are system users with their own login).
  recipientName:  string;
  recipientPhone: string;
  recipientEmail: string | null;
  referralCode:   string;
};

function trackingLink(code: string): string {
  return `${getAppUrl()}/r/${code}`;
}

export function ShareKitModal({ open, onClose, recipientName, recipientPhone, recipientEmail, referralCode }: Props) {
  const [posters, setPosters] = useState<ReferralPoster[]>([]);
  const [loadingPosters, setLoadingPosters] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { settings: company } = useCompanySettings();

  useEffect(() => {
    if (!open) return;
    setSelectedId(null);
    setCaption("");
    setAiError(null);
    setLoadingPosters(true);
    fetchReferralPosters(true).then((p) => { setPosters(p); setLoadingPosters(false); }).catch(() => setLoadingPosters(false));
  }, [open]);

  const selected = posters.find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    if (selected) setCaption(selected.captionTemplate);
  }, [selected]);

  async function handleAiDraft() {
    if (!selected) return;
    setDrafting(true);
    setAiError(null);
    const result = await draftReferralCaption(selected.title, selected.destination);
    if ("error" in result) setAiError(result.error);
    else setCaption(result.text.trim());
    setDrafting(false);
  }

  const link = trackingLink(referralCode);
  const fullMessage = selected ? `${caption}\n\n${selected.imageUrl}\n\n${link}` : "";

  function handleCopy() {
    navigator.clipboard.writeText(fullMessage).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-enter relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Send Referral Kit</h2>
            <p className="text-xs text-muted-foreground">To {recipientName} — they reshare it from their own phone</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {loadingPosters ? (
            <div className="flex h-24 items-center justify-center"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>
          ) : posters.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
              <ImageOff size={20} className="text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No posters yet — add one under Poster Kits first.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Choose a poster</label>
                <div className="grid grid-cols-3 gap-2">
                  {posters.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={cn(
                        "overflow-hidden rounded-xl border-2 transition-all text-left",
                        selectedId === p.id ? "border-primary" : "border-border hover:border-primary/40"
                      )}
                    >
                      <img src={p.imageUrl} alt={p.title} className="h-16 w-full object-cover" />
                      <p className="truncate px-1.5 py-1 text-[10px] font-medium text-foreground">{p.title}</p>
                    </button>
                  ))}
                </div>
              </div>

              {selected && (
                <>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Caption</label>
                      <button
                        onClick={handleAiDraft}
                        disabled={drafting}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline disabled:opacity-60"
                      >
                        {drafting ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                        AI Draft
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                    />
                    {aiError && <p className="mt-1 text-xs text-destructive font-medium">{aiError}</p>}
                  </div>

                  <div className="rounded-xl border border-border bg-muted/30 p-3">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
                    <p className="whitespace-pre-wrap text-xs text-foreground">{fullMessage}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={buildWhatsAppLink(recipientPhone, fullMessage)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
                    >
                      <MessageCircle size={15} /> WhatsApp
                    </a>
                    <a
                      href={`mailto:${recipientEmail ?? ""}?subject=${encodeURIComponent(`Your ${company.businessName} referral kit`)}&body=${encodeURIComponent(fullMessage)}`}
                      className={cn(
                        "inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:border-primary/40 hover:bg-muted transition-colors",
                        !recipientEmail && "pointer-events-none opacity-40"
                      )}
                      title={recipientEmail ? undefined : "No email on file"}
                    >
                      <Mail size={15} /> Email
                    </a>
                    <button
                      onClick={handleCopy}
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
                      title="Copy message"
                    >
                      {copied ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
