import { cn } from "@/lib/utils/helpers";

type Props = {
  children:   React.ReactNode;
  className?: string;
  padding?:   "none" | "sm" | "md" | "lg";
};

const paddings = {
  none: "",
  sm:   "p-4",
  md:   "p-5",
  lg:   "p-6",
};

export function Card({ children, className, padding = "md" }: Props) {
  return (
    <div className={cn(
      "rounded-xl border border-border bg-card shadow-card",
      paddings[padding],
      className
    )}>
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      "flex items-center justify-between gap-4 mb-4",
      className
    )}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn("text-sm font-semibold text-foreground", className)}>
      {children}
    </h3>
  );
}
