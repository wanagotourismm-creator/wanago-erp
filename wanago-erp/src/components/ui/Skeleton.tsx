import { cn } from "@/lib/utils/helpers";

type Props = {
  className?: string;
  rows?:      number;
};

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("skeleton h-4 w-full rounded", className)} />
  );
}

export function SkeletonCard({ rows = 3 }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={i === rows - 1 ? "w-2/3" : "w-full"} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border bg-muted/50 p-4">
        <Skeleton className="h-4 w-1/4" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border p-4 last:border-0">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
