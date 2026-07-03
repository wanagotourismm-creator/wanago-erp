import { cn } from "@/lib/utils/helpers";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "outline";

type Props = {
  children:  React.ReactNode;
  variant?:  BadgeVariant;
  className?: string;
};

const variants: Record<BadgeVariant, string> = {
  default: "bg-secondary text-secondary-foreground",
  success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  danger:  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  info:    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  outline: "border border-border text-muted-foreground bg-transparent",
};

export function Badge({ children, variant = "default", className }: Props) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}
