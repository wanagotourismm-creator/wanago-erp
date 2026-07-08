"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2, X } from "lucide-react";
import { useTrainingWalkthrough } from "@/modules/onboarding-training/hooks/useTrainingWalkthrough";
import { useTrainingAudio } from "@/modules/onboarding-training/hooks/useTrainingAudio";
import { TrainingTooltip } from "@/modules/onboarding-training/components/TrainingTooltip";
import { TrainingQuizModal } from "@/modules/onboarding-training/components/TrainingQuizModal";

const SEARCH_TIMEOUT_MS = 8000;
const TOOLTIP_WIDTH = 340;
const TOOLTIP_HEIGHT_ESTIMATE = 220;

export function TrainingWalkthroughOverlay() {
  const {
    active, currentStep, stepIndex, steps, language, isLastStep, quizPassed,
    quizModalOpen, quizSelected, quizResult, justCompleted, moduleTitle,
    setLanguage, selectAnswer, submitQuiz, reviewStep, goNext, goBack, exit, dismissCompletion,
  } = useTrainingWalkthrough();

  const audio = useTrainingAudio(currentStep, language);

  const [rect, setRect] = useState<DOMRect | null>(null);
  const [searching, setSearching] = useState(true);
  const rafRef = useRef<number | null>(null);
  const searchStartRef = useRef(0);

  useEffect(() => {
    if (!active || !currentStep) return;
    setRect(null);
    setSearching(true);
    searchStartRef.current = Date.now();

    function tick() {
      // targetSelector may be a plain human description rather than valid
      // CSS (content authoring can lag instrumenting the real element with
      // a data-tour-id) — querySelector throws on invalid syntax, so this
      // must never let that crash the walkthrough.
      let el: Element | null = null;
      try {
        el = currentStep ? document.querySelector(currentStep.targetSelector) : null;
      } catch {
        el = null;
      }
      if (el) {
        setRect(el.getBoundingClientRect());
        setSearching(false);
      } else if (Date.now() - searchStartRef.current > SEARCH_TIMEOUT_MS) {
        setSearching(false);
        setRect(null);
        return; // give up — tooltip shows a "couldn't find this" fallback, centered
      } else {
        setSearching(true);
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [active, currentStep?.id, currentStep?.targetSelector]); // eslint-disable-line react-hooks/exhaustive-deps

  if (justCompleted) {
    return (
      <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60" onClick={dismissCompletion} />
        <div className="modal-enter relative w-full max-w-sm rounded-2xl border border-primary/20 bg-card p-6 text-center shadow-2xl">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 size={28} className="text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Module Complete!</h2>
          <p className="mt-1 text-sm text-muted-foreground">You&apos;ve finished &ldquo;{justCompleted}&rdquo;.</p>
          <button onClick={dismissCompletion}
            className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
            Done
          </button>
        </div>
      </div>
    );
  }

  if (!active || !currentStep) return null;

  const pad = 8;
  const hasRect = !!rect;
  const top = hasRect ? Math.max(rect!.top - pad, 0) : 0;
  const left = hasRect ? Math.max(rect!.left - pad, 0) : 0;
  const width = hasRect ? rect!.width + pad * 2 : 0;
  const height = hasRect ? rect!.height + pad * 2 : 0;

  // Prefer placing the tooltip below the target; flip above if there's not
  // enough room; clamp horizontally so it never runs off-screen.
  const spaceBelow = hasRect ? window.innerHeight - (top + height) : 0;
  const placeAbove = hasRect && spaceBelow < TOOLTIP_HEIGHT_ESTIMATE && top > TOOLTIP_HEIGHT_ESTIMATE;
  const tooltipTop = hasRect
    ? (placeAbove ? Math.max(top - TOOLTIP_HEIGHT_ESTIMATE - 12, 12) : Math.min(top + height + 12, window.innerHeight - TOOLTIP_HEIGHT_ESTIMATE - 12))
    : window.innerHeight / 2 - TOOLTIP_HEIGHT_ESTIMATE / 2;
  const tooltipLeft = hasRect
    ? Math.min(Math.max(left, 12), window.innerWidth - TOOLTIP_WIDTH - 12)
    : window.innerWidth / 2 - TOOLTIP_WIDTH / 2;

  return (
    <>
      {hasRect ? (
        <>
          <div className="fixed inset-x-0 top-0 z-[200] bg-black/60 transition-all" style={{ height: top }} />
          <div className="fixed inset-x-0 bottom-0 z-[200] bg-black/60 transition-all" style={{ top: top + height }} />
          <div className="fixed z-[200] bg-black/60 transition-all" style={{ top, left: 0, width: left, height }} />
          <div className="fixed z-[200] bg-black/60 transition-all" style={{ top, left: left + width, right: 0, height }} />
          <div
            className="fixed z-[201] rounded-lg ring-4 ring-primary shadow-[0_0_0_4px_rgba(0,0,0,0.1),0_0_24px_6px_rgba(34,128,80,0.5)] pointer-events-none transition-all"
            style={{ top, left, width, height }}
          />
        </>
      ) : (
        <div className="fixed inset-0 z-[200] bg-black/60">
          {searching && (
            <div className="flex h-full items-center justify-center">
              <div className="flex items-center gap-2 rounded-xl bg-card px-4 py-3 text-sm text-foreground shadow-xl">
                <Loader2 size={16} className="animate-spin" /> Finding this on the page…
              </div>
            </div>
          )}
        </div>
      )}

      <button onClick={exit} title="Exit training"
        className="fixed right-4 top-4 z-[202] flex h-9 w-9 items-center justify-center rounded-xl bg-card text-muted-foreground shadow-lg hover:text-destructive transition-colors">
        <X size={16} />
      </button>
      <div className="fixed left-4 top-4 z-[202] rounded-xl bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg">
        {moduleTitle}
      </div>

      <audio ref={audio.audioRef} className="hidden" />

      {(!searching || hasRect) && (
        <TrainingTooltip
          step={currentStep}
          style={{ top: tooltipTop, left: tooltipLeft }}
          notFound={!hasRect && !searching}
          language={language}
          stepNumber={stepIndex + 1}
          totalSteps={steps.length}
          isLastStep={isLastStep}
          quizPassed={quizPassed}
          onLanguageChange={setLanguage}
          onNext={goNext}
          onBack={goBack}
          onExit={exit}
          audioStatus={audio.status}
          audioPlaying={audio.playing}
          audioMessage={audio.message}
          onToggleAudio={audio.toggle}
          onReplayAudio={audio.replay}
        />
      )}

      {quizModalOpen && currentStep.quiz && (
        <TrainingQuizModal
          quiz={currentStep.quiz}
          language={language}
          selected={quizSelected}
          result={quizResult}
          onSelect={selectAnswer}
          onSubmit={submitQuiz}
          onContinue={goNext}
          onReview={reviewStep}
        />
      )}
    </>
  );
}
