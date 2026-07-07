"use client";

import { PhoneCall } from "lucide-react";
import { useCallLogs } from "@/modules/call-logs/hooks/useCallLogs";
import { CallOutcomeBadge, CallMethodIcon } from "@/modules/call-logs/components/CallLogBadges";
import { formatDateTime, formatDate } from "@/lib/utils/helpers";

type Props = {
  leadId?:     string;
  customerId?: string;
};

// Self-contained — fetches its own call logs, drops straight into a Lead
// or Customer detail view via a single prop.
export function CallLogHistory({ leadId, customerId }: Props) {
  const { callLogs, loading } = useCallLogs({ leadId, customerId });

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <PhoneCall size={13} className="text-primary" />
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Call History</p>
      </div>
      {loading ? (
        <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">Loading…</p>
      ) : callLogs.length === 0 ? (
        <p className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">No calls logged yet</p>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border px-3">
          {callLogs.map((log) => (
            <div key={log.id} className="py-2.5 space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <CallMethodIcon method={log.callMethod} />
                  <span className="truncate text-sm font-medium text-foreground">
                    {log.direction === "outbound" ? "Outgoing" : "Incoming"} · {log.loggedByName}
                  </span>
                </div>
                <CallOutcomeBadge outcome={log.outcome} />
              </div>
              <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                <span>{formatDateTime(log.createdAt)}</span>
                {log.durationMinutes != null && <span>· {log.durationMinutes} min</span>}
                {log.followUpNeeded && log.followUpDate && (
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    · Follow up {formatDate(log.followUpDate)}
                  </span>
                )}
              </div>
              {log.notes && (
                <p className="line-clamp-2 text-xs text-muted-foreground">{log.notes}</p>
              )}
              {log.recordingFileUrl && (
                <div className="flex items-center gap-2 pt-1">
                  <audio controls src={log.recordingFileUrl} className="h-8 max-w-[220px]" />
                  <a
                    href={log.recordingFileUrl}
                    download
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    Download
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
