import { cn } from "@/lib/utils/helpers";

type Props = {
  title:       string;
  description?: string;
  actions?:    React.ReactNode;
  className?:  string;
  // Lets the Onboarding Training walkthrough spotlight "you're on the
  // right page" as a stable anchor, independent of any permission-gated
  // action button that may or may not render for a given employee.
  tourId?:     string;
};

export function PageHeader({ title, description, actions, className, tourId }: Props) {
  return (
    <div
      data-tour-id={tourId}
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6",
        className
      )}>
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0 sm:flex-nowrap">
          {actions}
        </div>
      )}
    </div>
  );
}
