"use client";

import { ChevronLeft, ChevronRight, X, HelpCircle, AlertTriangle, Play, Pause, RotateCcw, Loader2, VolumeX, Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import type { TrainingStep } from "@/modules/onboarding-training/types";
import type { AudioStatus, AudioBackend } from "@/modules/onboarding-training/hooks/useTrainingAudio";

type Props = {
  step:         TrainingStep;
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
  audioBackend: AudioBackend;
  audioPlaying: boolean;
  audioMessage: string | null;
  onToggleAudio: () => void;
  onReplayAudio: () => void;
  autoAdvance:  boolean;
  onToggleAutoAdvance: () => void;
};

// A YouTube-style bottom caption/control bar, fixed to the bottom of the
// screen — captions front and center (like subtitles) with a big play/
// pause "now playing" control, instead of a small tooltip floating near
// the spotlighted element. This is what makes the walkthrough read as a
// video/presentation rather than a help tooltip.
export function TrainingTooltip({
  step, notFound, language, stepNumber, totalSteps, isLastStep, quizPassed,
  onLanguageChange, onNext, onBack, onExit,
  audioStatus, audioBackend, audioPlaying, audioMessage, onToggleAudio, onReplayAudio,
  autoAdvance, onToggleAutoAdvance,
}: Props) {
  const explanation = language === "en" ? step.explanationEn : step.explanationMl;
  const hasQuiz = !!step.quiz;
  const needsQuiz = hasQuiz && !quizPassed;
  const hasAudio = audioStatus === "ready";

  return (
    <div className="fixed inset-x-0 bottom-0 z-[202] modal-enter">
      <div className="mx-auto max-w-3xl px-3 pb-3 sm:px-4 sm:pb-4">
        <div className="overflow-hidden rounded-2xl border border-primary/30 bg-card/95 shadow-2xl backdrop-blur">

          <div className="flex items-center justify-between border-b border-border px-4 py-2">
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

          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={hasAudio ? onToggleAudio : undefined} disabled={!hasAudio}
              title={hasAudio ? (audioPlaying ? "Pause" : "Play") : "Voiceover unavailable"}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 disabled:opacity-40 transition-colors">
              {audioStatus === "loading" ? <Loader2 size={18} className="animate-spin" /> : audioPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>

            <div className="min-w-0 flex-1">
              {notFound && (
                <div className="mb-1.5 flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                  <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                  <span>Couldn&apos;t find this element on the page — the explanation below still applies.</span>
                </div>
              )}
              <p className="text-sm leading-snug text-foreground sm:text-base">{explanation}</p>
              {needsQuiz && (
                <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  <HelpCircle size={12} /> This step has a quiz — answer it to continue.
                </p>
              )}
            </div>

            {hasAudio && (
              <button onClick={onReplayAudio} title="Replay" className="flex-shrink-0 text-muted-foreground hover:text-foreground">
                <RotateCcw size={16} />
              </button>
            )}
            {(audioStatus === "unavailable" || audioStatus === "error") && (
              <span className="flex-shrink-0" title={audioMessage ?? undefined}>
                <VolumeX size={16} className="text-muted-foreground/50" />
              </span>
            )}
          </div>

          {hasAudio && audioBackend === "browser" && (
            <p className="px-4 pb-1 text-[10px] text-muted-foreground/70">Voiceover: device voice (free)</p>
          )}

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
      </div>
    </div>
  );
}
