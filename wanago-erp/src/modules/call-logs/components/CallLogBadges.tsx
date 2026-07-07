import { Phone, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import type { CallMethod } from "@/modules/call-logs/types";

const OUTCOME_LABELS: Record<string, string> = {
  connected:    "Connected",
  no_answer:    "No Answer",
  busy:         "Busy",
  wrong_number: "Wrong Number",
};

const OUTCOME_STYLES: Record<string, string> = {
  connected:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  no_answer:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  busy:         "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  wrong_number: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function CallOutcomeBadge({ outcome }: { outcome: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      OUTCOME_STYLES[outcome] ?? "bg-muted text-muted-foreground"
    )}>
      {OUTCOME_LABELS[outcome] ?? outcome}
    </span>
  );
}

export function CallMethodIcon({ method, size = 14 }: { method: CallMethod; size?: number }) {
  return method === "whatsapp"
    ? <MessageCircle size={size} className="text-green-600" />
    : <Phone size={size} className="text-primary" />;
}
