import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils/helpers";

type Props = {
  label:      string;
  value:      string | number;
  sub?:       string;
  featured?:  boolean;
  href?:      string;
  tourId?:    string;
};

export function StatCard({ label, value, sub, featured = false, href, tourId }: Props) {
  const className = cn(
    "relative block rounded-2xl p-5 transition-all duration-200",
    href && "hover:-translate-y-0.5 hover:shadow-lg cursor-pointer",
    featured
      ? "bg-primary text-white shadow-md"
      : "bg-card border border-border text-foreground shadow-sm"
  );

  const content = (
    <>
      <div className="flex items-start justify-between mb-4">
        <p className={cn(
          "text-sm font-medium",
          featured ? "text-white/70" : "text-muted-foreground"
        )}>
          {label}
        </p>
        {href && (
          <div className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full border transition-colors",
            featured
              ? "border-white/30 text-white/70 hover:bg-white/10"
              : "border-border text-muted-foreground hover:bg-muted"
          )}>
            <ArrowUpRight size={14} />
          </div>
        )}
      </div>

      <p className={cn(
        "text-3xl font-bold tracking-tight",
        featured ? "text-white" : "text-foreground"
      )}>
        {value}
      </p>

      {sub && (
        <p className={cn(
          "mt-2 text-xs",
          featured ? "text-white/60" : "text-muted-foreground"
        )}>
          {sub}
        </p>
      )}
    </>
  );

  if (href) {
    return <Link href={href} className={className} data-tour-id={tourId}>{content}</Link>;
  }
  return <div className={className} data-tour-id={tourId}>{content}</div>;
}
