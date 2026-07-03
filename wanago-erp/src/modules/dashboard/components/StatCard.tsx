import { cn } from "@/lib/utils/helpers";

type Props = {
  label:      string;
  value:      string | number;
  sub?:       string;
  accent?:    "default" | "danger" | "success";
  border?:    string;
};

export function StatCard({ label, value, sub, accent = "default", border }: Props) {
  return (
    <div className={cn(
      "rounded-xl border bg-card p-5 shadow-card",
      border ? `border-l-4 ${border}` : "border-border"
    )}>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className={cn(
        "mt-2 text-3xl font-bold",
        accent === "danger"  && "text-destructive",
        accent === "success" && "text-primary",
        accent === "default" && "text-foreground",
      )}>
        {value}
      </p>
      {sub && (
        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}
