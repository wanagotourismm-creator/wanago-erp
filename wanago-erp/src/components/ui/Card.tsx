import { cn } from "@/lib/utils/helpers";

type Props = {
  children:   React.ReactNode;
  className?: string;
  padding?:   "none" | "sm" | "md" | "lg";
  hover?:     boolean;
  radius?:    "2xl" | "3xl";
  tone?:      "default" | "dark";
};

const paddings = { none: "", sm: "p-4", md: "p-5", lg: "p-6" };
const radiuses = { "2xl": "rounded-2xl", "3xl": "rounded-3xl" };

export function Card({ children, className, padding = "md", hover = false, radius = "2xl", tone = "default" }: Props) {
  return (
    <div className={cn(
      "border shadow-sm transition-all duration-200",
      radiuses[radius],
      tone === "dark" ? "bg-dark-surface text-dark-surface-foreground border-transparent" : "bg-card",
      hover && "hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 cursor-pointer",
      paddings[padding],
      className
    )}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex items-center justify-between gap-4 mb-4", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("text-sm font-semibold text-foreground", className)}>{children}</h3>;
}
