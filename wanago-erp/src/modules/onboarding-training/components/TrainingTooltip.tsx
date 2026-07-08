"use client";

import { ChevronLeft, ChevronRight, X, HelpCircle, AlertTriangle, Play, Pause, RotateCcw, Loader2, VolumeX, Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import type { TrainingStep } from "@/modules/onboarding-training/types";
import type { AudioStatus } from "@/modules/onboarding-training/hooks/useTrainingAudio";

type Props = {
  step:         TrainingStep;
  style:        React.CSSProperties;
  notFound:     boolean;
  language:     "en" | "ml";
  stepNumber:   number;
  totalSteps:   number;
  isLastStep:   boolean;
  quizPassed:   boolean;
  onLanguageChange: (lang: "en" | "ml") => void;
  onNext:  () => void;
  onBack:  () => void;
  onExit:  () => void;
  audioStatus:  AudioStatus;
  audioPlaying: boolean;
  audioMessage: string | null;
  onToggleAudio: () => void;
  onReplayAudio: () => void;
  autoAdvance:  boolean;
  onToggleAutoAdvance: () => void;
};

export function TrainingTooltip({
  step, style, notFound, language, stepNumber, totalSteps, isLastStep, quizPassed,
  onLanguageChange, onNext, onBack, onExit,
  audioStatus, audioPlaying, audioMessage, onToggleAudio, onReplayAudio,
  autoAdvance, onToggleAutoAdvance,
}: Props) {
  const explanation = language === "en" ? step.explanationEn : step.explanationMl;
  const hasQuiz = !!step.quiz;
  const needsQuiz = hasQuiz && !quizPassed;

  return (
    <div
      style={style}
      className="fixed z-[202] w-[92vw] max-w-[340px] rounded-2xl border border-primary/30 bg-card shadow-2xl overflow-hidden modal-enter"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Step {stepNumber} of {totalSteps}
        </p>
        <div className="flex items-center gap-2">
          <button onClick={onToggleAutoAdvance} title={autoAdvance ? "Presentation mode: on — steps advance on their own" : "Presentation mode: off — advance manually"}
            className={cn(
              "flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors",
              autoAdvance ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
            )}>
            <Clapperboard size={11} /> Auto
          </button>
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <button onClick={() => onLanguageChange("en")}
              className={cn("px-2 py-1 text-[11px] font-semibold transition-colors", language === "en" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground")}>
              EN
            </button>
            <button onClick={() => onLanguageChange("ml")}
              className={cn("px-2 py-1 text-[11px] font-semibold transition-colors", language === "ml" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground")}>
              ML
            </button>
          </div>
          <button onClick={onExit} title="Exit training" className="text-muted-foreground hover:text-foreground"><X size={15} /></button>
        </div>
      </div>

      <div className="px-4 py-3">
        {notFound && (
          <div className="mb-2 flex items-start gap-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 px-2.5 py-2 text-[11px] text-amber-700 dark:text-amber-400">
            <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
            <span>Couldn&apos;t find this element on the page — the explanation below still applies.</span>
          </div>
        )}
        <p className="text-sm leading-relaxed text-foreground">{explanation}</p>

        <div className="mt-2.5 flex items-center gap-2">
          {audioStatus === "loading" && (
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Loader2 size={12} className="animate-spin" /> Preparing voiceover…
            </span>
          )}
          {audioStatus === "ready" && (
            <>
              <button onClick={onToggleAudio}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 transition-colors">
                {audioPlaying ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
              </button>
              <button onClick={onReplayAudio} title="Replay" className="text-muted-foreground hover:text-foreground">
                <RotateCcw size={13} />
              </button>
              <span className="text-[11px] text-muted-foreground">Voiceover {audioPlaying ? "playing" : "ready"}</span>
            </>
          )}
          {(audioStatus === "unavailable" || audioStatus === "error") && (
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70" title={audioMessage ?? undefined}>
              <VolumeX size={12} /> {audioStatus === "unavailable" ? "Voiceover not set up yet" : "Voiceover unavailable"}
            </span>
          )}
        </div>

        {needsQuiz && (
          <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            <HelpCircle size={12} /> This step has a quiz — answer it to continue.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2.5">
        <button onClick={onBack} disabled={stepNumber === 1}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
          <ChevronLeft size={14} /> Back
        </button>
        <button onClick={onNext}
          className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition-colors">
          {needsQuiz ? "Take Quiz" : isLastStep ? "Finish" : "Next"} <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
