import { cn } from "@/lib/utils/helpers";
import type { FormLifecycleStatus, FormFieldType } from "@/modules/forms/types";

const STATUS_LABELS: Record<FormLifecycleStatus, string> = {
  draft: "Draft", published: "Published", closed: "Closed",
};
const STATUS_STYLES: Record<FormLifecycleStatus, string> = {
  draft:     "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  closed:    "bg-muted text-muted-foreground",
};

export function FormStatusBadge({ status }: { status: FormLifecycleStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export const FIELD_TYPE_OPTIONS: { value: FormFieldType; label: string }[] = [
  { value: "short_text",      label: "Short Text" },
  { value: "long_text",       label: "Long Text" },
  { value: "number",          label: "Number" },
  { value: "dropdown",        label: "Dropdown" },
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "checkboxes",      label: "Checkboxes" },
  { value: "date",            label: "Date" },
  { value: "file",            label: "File Upload" },
  { value: "rating",          label: "Rating (1-5)" },
];

export const CHOICE_FIELD_TYPES: FormFieldType[] = ["dropdown", "multiple_choice", "checkboxes"];
