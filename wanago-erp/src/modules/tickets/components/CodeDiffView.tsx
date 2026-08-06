"use client";

import { diffLines } from "diff";

type Props = {
  oldContent: string;
  newContent: string;
};

const MAX_RENDERED_LINES = 800;

// Line-level diff for the AI-review approval screen — an admin needs to see
// exactly what a proposed single-file fix changes before approving it, not
// just trust the AI's prose explanation.
export function CodeDiffView({ oldContent, newContent }: Props) {
  const parts = diffLines(oldContent, newContent);

  let lineCount = 0;
  const rows: { key: string; kind: "add" | "remove" | "context"; text: string }[] = [];
  outer: for (const part of parts) {
    const kind = part.added ? "add" : part.removed ? "remove" : "context";
    const lines = part.value.split("\n");
    if (lines[lines.length - 1] === "") lines.pop();
    for (const line of lines) {
      rows.push({ key: `${rows.length}`, kind, text: line });
      lineCount++;
      if (lineCount > MAX_RENDERED_LINES) break outer;
    }
  }

  return (
    <div className="max-h-96 overflow-auto rounded-xl border border-border bg-muted/20 font-mono text-[11px] leading-5">
      {rows.map((row) => (
        <div
          key={row.key}
          className={
            row.kind === "add" ? "whitespace-pre-wrap bg-green-500/10 px-2 text-green-700 dark:text-green-400" :
            row.kind === "remove" ? "whitespace-pre-wrap bg-red-500/10 px-2 text-red-700 dark:text-red-400" :
            "whitespace-pre-wrap px-2 text-muted-foreground"
          }
        >
          {row.kind === "add" ? "+ " : row.kind === "remove" ? "- " : "  "}{row.text}
        </div>
      ))}
      {lineCount > MAX_RENDERED_LINES && (
        <div className="px-2 py-1 text-muted-foreground/70">… diff truncated, {lineCount - MAX_RENDERED_LINES}+ more lines not shown</div>
      )}
    </div>
  );
}
