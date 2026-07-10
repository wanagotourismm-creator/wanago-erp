"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check, ExternalLink, QrCode } from "lucide-react";
import { buildUpiLink } from "@/lib/upi";
import { formatCurrency } from "@/lib/utils/helpers";

type Props = {
  upiId: string;
  payeeName: string;
  amount: number;
  note: string;
  refId: string;
};

// Shown on an invoice/booking so staff can display the QR to a customer in
// person, or copy/share the link (e.g. over WhatsApp) — there's no
// customer-facing portal in this app, so this is staff-mediated rather than
// self-serve. Payment confirmation is still manual; see buildUpiLink's
// comment for why that's a deliberate trade-off, not a gap.
export function UpiPaymentPanel({ upiId, payeeName, amount, note, refId }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const link = upiId ? buildUpiLink({ payeeVpa: upiId, payeeName, amount, note, refId }) : null;

  useEffect(() => {
    if (!link) { setQrDataUrl(null); return; }
    let cancelled = false;
    QRCode.toDataURL(link, { width: 200, margin: 1 })
      .then((url) => { if (!cancelled) setQrDataUrl(url); })
      .catch(() => { if (!cancelled) setQrDataUrl(null); });
    return () => { cancelled = true; };
  }, [link]);

  if (!upiId) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
        Set a UPI ID in Company Settings to show a &ldquo;Pay via UPI&rdquo; QR here.
      </div>
    );
  }

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <QrCode size={14} className="text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Pay via UPI</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- a locally-generated data: URL, not a remote image
            <img src={qrDataUrl} alt="UPI payment QR" className="h-full w-full" />
          ) : (
            <div className="h-full w-full animate-pulse bg-muted" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-semibold text-foreground">{formatCurrency(amount)}</p>
          <p className="text-[11px] text-muted-foreground">Scan with any UPI app, or share the link below</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy Link"}
            </button>
            {link && (
              <a href={link}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors">
                <ExternalLink size={12} /> Open in UPI App
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
