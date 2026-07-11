"use client";

import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/helpers";

type Props = {
  values:      string[];
  onChange:    (values: string[]) => void;
  placeholder?: string;
  addLabel?:    string;
};

const inputClass = cn(
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none transition-all",
  "placeholder:text-muted-foreground/60",
  "hover:border-primary/40",
  "focus:border-primary focus:ring-0",
  "[&:focus]:shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
);

// Add/remove/edit a flat list of short text lines — used for inclusions,
// exclusions, day bullet points, contact phones, and office addresses.
// Deliberately not a react-hook-form useFieldArray: those fields are plain
// string[] in the schema (not arrays of objects), so a small controlled
// component is simpler than wrapping every line in a synthetic { value } object.
export function StringListEditor({ values, onChange, placeholder, addLabel = "Add line" }: Props) {
  function updateLine(index: number, value: string) {
    onChange(values.map((v, i) => (i === index ? value : v)));
  }

  function removeLine(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  function addLine() {
    onChange([...values, ""]);
  }

  return (
    <div className="space-y-2">
      {values.map((value, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            className={inputClass}
            placeholder={placeholder}
            value={value}
            onChange={(e) => updateLine(index, e.target.value)}
          />
          <button
            type="button"
            onClick={() => removeLine(index)}
            title="Remove"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addLine}
        className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-muted transition-colors"
      >
        <Plus size={13} /> {addLabel}
      </button>
    </div>
  );
}
