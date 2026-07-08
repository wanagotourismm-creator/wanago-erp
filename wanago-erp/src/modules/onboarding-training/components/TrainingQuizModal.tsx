"use client";

import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import type { TrainingStepQuiz } from "@/modules/onboarding-training/types";

type Props = {
  quiz:     TrainingStepQuiz;
  language: "en" | "ml";
  selected: number | null;
  result:   "correct" | "wrong" | null;
  onSelect: (index: number) => void;
  onSubmit: () => void;
  onContinue: () => void; // correct — advance to the next step
  onReview:   () => void; // wrong — close and re-show this step's explanation
};

export function TrainingQuizModal({ quiz, language, selected, result, onSelect, onSubmit, onContinue, onReview }: Props) {
  const question = language === "en" ? quiz.questionEn : quiz.questionMl;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" />
      <div className="modal-enter relative w-full max-w-md rounded-2xl border border-primary/20 bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <HelpCircle size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Quick Check</h2>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm font-medium text-foreground">{question}</p>

          <div className="space-y-2">
            {quiz.options.map((opt, i) => {
              const label = language === "en" ? opt.en : opt.ml;
              const isSelected = selected === i;
              const isCorrectOption = result && i === quiz.correctIndex;
              const isWrongPick = result === "wrong" && isSelected;
              return (
                <button key={i} onClick={() => !result && onSelect(i)} disabled={!!result}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                    isCorrectOption && "border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400",
                    isWrongPick && "border-destructive bg-destructive/10 text-destructive",
                    !result && isSelected && "border-primary bg-primary/10 text-primary",
                    !result && !isSelected && "border-border text-foreground hover:border-primary/40"
                  )}>
                  {isCorrectOption && <CheckCircle2 size={15} className="flex-shrink-0" />}
                  {isWrongPick && <XCircle size={15} className="flex-shrink-0" />}
                  {label}
                </button>
              );
            })}
          </div>

          {result === "correct" && (
            <div className="flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-900/20 px-3 py-2 text-sm font-medium text-green-700 dark:text-green-400">
              <CheckCircle2 size={16} /> Correct!
            </div>
          )}
          {result === "wrong" && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              <XCircle size={16} /> Not quite — review this step and try again.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/30 px-5 py-3">
          {result === "correct" && (
            <button onClick={onContinue} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
              Continue
            </button>
          )}
          {result === "wrong" && (
            <button onClick={onReview} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
              Review this step again
            </button>
          )}
          {!result && (
            <button onClick={onSubmit} disabled={selected == null}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-40 transition-colors">
              Submit Answer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
