"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, Loader2, Copy, Check, MessageCircle } from "lucide-react";
import { useCallLogs } from "@/modules/call-logs/hooks/useCallLogs";
import { fetchQuotationByLeadId } from "@/modules/quotations/services/quotation.service";
import { computeLeadClosability, type LeadClosability } from "@/modules/leads/services/lead-score.service";
import { getLeadEngineSuggestion } from "@/modules/leads/services/lead-engine-ai.service";
import { buildWhatsAppLink, toDate, cn } from "@/lib/utils/helpers";
import type { Lead } from "@/modules/leads/types";
import type { Quotation } from "@/modules/quotations/types";
import type { LeadEngineDraft } from "@/modules/leads/schemas/lead-engine.schema";

type Props = { lead: Lead };

const DAY_MS = 24 * 60 * 60 * 1000;

const BAND_STYLES: Record<LeadClosability["band"], { bar: string; text: string; label: string }> = {
  hot:     { bar: "bg-red-500",    text: "text-red-700 dark:text-red-400",       label: "Hot" },
  warm:    { bar: "bg-amber-500",  text: "text-amber-700 dark:text-amber-400",   label: "Warm" },
  at_risk: { bar: "bg-orange-500", text: "text-orange-700 dark:text-orange-400", label: "At risk" },
  cold:    { bar: "bg-blue-500",   text: "text-blue-700 dark:text-blue-400",     label: "Cold" },
};

// Helps an agent decide "should I act on this lead, and how" the moment
// they open it — a free/instant rule-based closability score (see
// lead-score.service.ts) renders immediately, and an on-demand AI button
// drafts a concrete next step + a ready-to-send WhatsApp pitch. Hidden
// entirely for won/lost leads (see below) since there's nothing left to
// close. Self-fetches call logs + quotation so LeadDetailModal's prop
// surface stays untouched.
export function LeadEnginePanel({ lead }: Props) {
  const isClosed = lead.stage === "won" || lead.stage === "lost";
  const { callLogs, loading: callLogsLoading } = useCallLogs({ leadId: isClosed ? undefined : lead.id });
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [quotationLoading, setQuotationLoading] = useState(!isClosed);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<LeadEngineDraft | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isClosed) return;
    let cancelled = false;
    setQuotationLoading(true);
    fetchQuotationByLeadId(lead.id)
      .then((q) => { if (!cancelled) setQuotation(q); })
      .catch(() => { if (!cancelled) setQuotation(null); })
      .finally(() => { if (!cancelled) setQuotationLoading(false); });
    return () => { cancelled = true; };
  }, [lead.id, isClosed]);

  const closability = useMemo(() => {
    if (isClosed || callLogsLoading || quotationLoading) return null;
    return computeLeadClosability({ stage: lead.stage, priority: lead.priority, callLogs, quotation, createdAt: lead.createdAt });
  }, [isClosed, callLogsLoading, quotationLoading, lead.stage, lead.priority, callLogs, quotation, lead.createdAt]);

  if (isClosed) return null;

  async function handleGetSuggestion() {
    if (!closability) return;
    setAiLoading(true);
    setAiError(null);
    setSuggestion(null);
    const recentCallLogs = callLogs.slice(0, 3).map((c) => {
      const date = toDate(c.createdAt);
      const daysAgo = date ? Math.floor((Date.now() - date.getTime()) / DAY_MS) : 0;
      return { outcome: c.outcome, notes: c.notes, daysAgo };
    });
    const result = await getLeadEngineSuggestion({
      leadName: lead.name, destination: lead.destination, tripType: lead.tripType,
      pax: lead.pax, budget: lead.budget, travelDate: lead.travelDate,
      stage: lead.stage, priority: lead.priority,
      quotationStatus: quotation?.status ?? null,
      recentCallLogs,
      score: closability.score, band: closability.band, reasons: closability.reasons,
    });
    setAiLoading(false);
    if ("error" in result) setAiError(result.error);
    else setSuggestion(result);
  }

  function copyPitch() {
    if (!suggestion) return;
    navigator.clipboard.writeText(suggestion.pitch).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }

  const band = closability ? BAND_STYLES[closability.band] : null;

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles size={13} className="text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Lead Engine</p>
      </div>

      {!closability ? (
        <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full transition-all", band!.bar)} style={{ width: `${closability.score}%` }} />
            </div>
            <span className={cn("flex-shrink-0 text-xs font-semibold", band!.text)}>
              {band!.label} · {closability.score}
            </span>
          </div>

          {closability.reasons.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {closability.reasons.map((r, i) => (
                <span key={i} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {r}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {!suggestion && (
        <button
          type="button"
          onClick={handleGetSuggestion}
          disabled={!closability || aiLoading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-60 transition-colors"
        >
          {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {aiLoading ? "Thinking…" : "Get AI Next Step & Pitch"}
        </button>
      )}

      {aiError && <p className="text-xs text-destructive">{aiError}</p>}

      {suggestion && (
        <div className="space-y-2 rounded-lg border border-primary/20 bg-card p-3">
          <p className="text-xs font-semibold text-foreground">{suggestion.nextAction}</p>
          <p className="whitespace-pre-wrap rounded-lg bg-muted/40 p-2.5 text-xs text-foreground">{suggestion.pitch}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyPitch}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
            >
              {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <a
              href={buildWhatsAppLink(lead.phone, suggestion.pitch)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
            >
              <MessageCircle size={12} /> Send via WhatsApp
            </a>
            <button
              type="button"
              onClick={handleGetSuggestion}
              disabled={aiLoading}
              title="Regenerate"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-60 transition-colors"
            >
              {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
