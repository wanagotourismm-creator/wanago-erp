"use client";

import { useEffect, useState } from "react";
import { Loader2, MousePointerClick, UserPlus2, CheckCircle2, TrendingUp, Copy, Check, Sparkles, Send, Trophy } from "lucide-react";
import { PortalShell } from "@/modules/portal/components/PortalShell";
import {
  fetchPartnerMe, fetchPartnerPosters, submitPartnerReferral, fetchPartnerLeaderboard,
  type PartnerPortalMe, type PartnerPortalPoster, type PartnerLeaderboard,
} from "@/modules/portal/services/partner-portal.service";
import { formatCurrency, cn } from "@/lib/utils/helpers";

function trackingLink(code: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://wanago-erp.vercel.app";
  return `${base}/r/${code}`;
}

function StatTile({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
        <Icon size={16} className="text-primary" />
      </div>
      <p className="mt-3 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function PartnerDashboard() {
  const [me, setMe] = useState<PartnerPortalMe | null>(null);
  const [posters, setPosters] = useState<PartnerPortalPoster[]>([]);
  const [leaderboard, setLeaderboard] = useState<PartnerLeaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const [referName, setReferName] = useState("");
  const [referPhone, setReferPhone] = useState("");
  const [referDestination, setReferDestination] = useState("");
  const [referSubmitting, setReferSubmitting] = useState(false);
  const [referError, setReferError] = useState<string | null>(null);
  const [referSuccess, setReferSuccess] = useState(false);

  useEffect(() => {
    Promise.all([fetchPartnerMe(), fetchPartnerPosters(), fetchPartnerLeaderboard()])
      .then(([m, p, l]) => { setMe(m); setPosters(p); setLeaderboard(l); })
      .finally(() => setLoading(false));
  }, []);

  function copyLink() {
    if (!me) return;
    navigator.clipboard.writeText(trackingLink(me.referralCode));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmitReferral() {
    if (referName.trim().length < 2 || referPhone.trim().length < 10) {
      setReferError("Enter a valid name and phone number.");
      return;
    }
    setReferSubmitting(true);
    setReferError(null);
    const result = await submitPartnerReferral({ name: referName, phone: referPhone, destination: referDestination });
    setReferSubmitting(false);
    if (result.error) setReferError(result.error);
    else {
      setReferSuccess(true);
      setReferName(""); setReferPhone(""); setReferDestination("");
      setTimeout(() => setReferSuccess(false), 3000);
    }
  }

  if (loading || !me) {
    return <div className="flex h-64 items-center justify-center"><Loader2 size={22} className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-foreground">Hi {me.fullName.split(" ")[0]} 👋</h1>
        <p className="text-sm text-muted-foreground">Here&apos;s how your referrals are doing</p>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Your Tracking Link</p>
        <div className="mt-1.5 flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg bg-card px-3 py-2 text-xs text-foreground">{trackingLink(me.referralCode)}</code>
          <button onClick={copyLink} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={MousePointerClick} label="Clicks" value={String(me.stats.clicks)} />
        <StatTile icon={UserPlus2} label="Leads Sent" value={String(me.stats.leadsSent)} />
        <StatTile icon={CheckCircle2} label="Bookings" value={String(me.stats.bookings)} />
        <StatTile icon={TrendingUp} label="Bonus Pending" value={formatCurrency(me.stats.bonusPending)} />
      </div>

      {leaderboard && leaderboard.top.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy size={15} className="text-primary" />
              <p className="text-sm font-semibold text-foreground">Top Referral Executives</p>
            </div>
            {leaderboard.myRank && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                You&apos;re #{leaderboard.myRank} of {leaderboard.totalPartners}
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {leaderboard.top.map((entry) => (
              <div
                key={entry.rank}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm",
                  entry.isMe ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-muted-foreground w-5">
                    {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `${entry.rank}.`}
                  </span>
                  <span className={cn("font-medium", entry.isMe ? "text-primary" : "text-foreground")}>
                    {entry.name}{entry.isMe && " (You)"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{entry.bookings} bookings · {formatCurrency(entry.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Send size={15} className="text-primary" />
          <p className="text-sm font-semibold text-foreground">Refer Someone Directly</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input value={referName} onChange={(e) => setReferName(e.target.value)} placeholder="Their name"
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          <input value={referPhone} onChange={(e) => setReferPhone(e.target.value)} placeholder="Their phone"
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          <input value={referDestination} onChange={(e) => setReferDestination(e.target.value)} placeholder="Destination (optional)"
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </div>
        {referError && <p className="mt-2 text-xs font-medium text-destructive">{referError}</p>}
        {referSuccess && <p className="mt-2 text-xs font-medium text-green-600">Submitted — our team will reach out to them.</p>}
        <button
          onClick={handleSubmitReferral}
          disabled={referSubmitting}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {referSubmitting && <Loader2 size={13} className="animate-spin" />}
          Submit Referral
        </button>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <Sparkles size={14} className="text-primary" />
          <p className="text-sm font-semibold text-foreground">Your Poster Kit</p>
        </div>
        {posters.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-8 text-center text-xs text-muted-foreground">No posters available yet — check back soon.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {posters.map((p) => (
              <div key={p.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <img src={p.imageUrl} alt={p.title} className="h-24 w-full object-cover" />
                <div className="p-2">
                  <p className="truncate text-xs font-semibold text-foreground">{p.title}</p>
                  <a
                    href={p.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block truncate text-[11px] text-primary hover:underline"
                  >
                    Download / Share
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {me.leads.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">Recent Leads You Sent</p>
          <div className="space-y-1.5">
            {me.leads.slice(0, 10).map((l, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-xs">
                <span className="font-medium text-foreground">{l.name} <span className="font-normal text-muted-foreground">— {l.destination}</span></span>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", l.stage === "won" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground")}>
                  {l.stage}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PartnerPortalPage() {
  return (
    <PortalShell requiredType="partner" title="Referral Executive Portal">
      <PartnerDashboard />
    </PortalShell>
  );
}
