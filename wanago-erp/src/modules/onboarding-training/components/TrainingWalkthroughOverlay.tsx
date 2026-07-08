"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2, X, Award, Download } from "lucide-react";
import { useTrainingWalkthrough } from "@/modules/onboarding-training/hooks/useTrainingWalkthrough";
import { useTrainingAudio } from "@/modules/onboarding-training/hooks/useTrainingAudio";
import { useAuthStore } from "@/store/auth.store";
import { submitPractice } from "@/modules/onboarding-training/services/practice-submission.service";
import { TrainingTooltip } from "@/modules/onboarding-training/components/TrainingTooltip";
import { TrainingQuizModal } from "@/modules/onboarding-training/components/TrainingQuizModal";
import { TrainingPracticeFormModal } from "@/modules/onboarding-training/components/TrainingPracticeFormModal";
import { TrainingProgressBar } from "@/modules/onboarding-training/components/TrainingProgressBar";

const SEARCH_TIMEOUT_MS = 8000;
const NO_AUDIO_DWELL_MS = 6000; // presentation-style pacing when there's no narration to time off of

export function TrainingWalkthroughOverlay() {
  const {
    active, currentStep, stepIndex, steps, language, isLastStep, quizPassed, moduleId,
    quizModalOpen, quizSelected, quizResult, justCompleted, justIssuedCertificate, moduleTitle, autoAdvance,
    setLanguage, setAutoAdvance, selectAnswer, submitQuiz, reviewStep, goNext, goBack, exit, dismissCompletion,
  } = useTrainingWalkthrough();

  const audio = useTrainingAudio(currentStep, language);
  const { user } = useAuthStore();
  const [practiceOpen, setPracticeOpen] = useState(false);

  async function handlePracticeSubmit(formData: Record<string, string>) {
    if (!user || !moduleId || !currentStep) return;
    await submitPractice({ userId: user.uid, moduleId, stepId: currentStep.id, formData }).catch(() => {});
  }

  // Presentation mode: once narration finishes (or, with no narration, a
  // fixed dwell time passes), advance automatically — the same goNext()
  // a manual click would trigger, so a step with an unpassed quiz still
  // just opens the quiz and then waits for a real answer, never skips it.
  useEffect(() => {
    if (!active || !currentStep || quizModalOpen || !autoAdvance) return;
    if (audio.status === "ready") {
      if (audio.ended) goNext();
      return;
    }
    if (audio.status === "unavailable" || audio.status === "error") {
      const timer = setTimeout(() => goNext(), NO_AUDIO_DWELL_MS);
      return () => clearTimeout(timer);
    }
    // status === "loading": wait, don't race ahead of narration generation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, currentStep?.id, quizModalOpen, autoAdvance, audio.status, audio.ended]);

  // "Review this step again" replays the narration from the top too — a
  // natural match for "re-watch/re-read before retrying," and it resets
  // audio.ended so auto-advance doesn't instantly reopen the quiz.
  function handleReviewStep() {
    reviewStep();
    audio.replay();
  }

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

          {justIssuedCertificate && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-left">
              <Award size={18} className="flex-shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground">Certificate earned!</p>
                <p className="text-[11px] text-muted-foreground">{justIssuedCertificate.certificateId}{justIssuedCertificate.employeeEmail && " · emailed to you"}</p>
              </div>
              <a href={justIssuedCertificate.pdfUrl} target="_blank" rel="noreferrer" title="Download PDF"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-primary hover:bg-primary/10 transition-colors">
                <Download size={15} />
              </a>
            </div>
          )}

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

  const explanationText = language === "en" ? currentStep.explanationEn : currentStep.explanationMl;
  const estimatedMs = Math.max(3000, Math.min(15000, explanationText.split(/\s+/).length * 400));
  const barPlaying = autoAdvance && !quizModalOpen && (
    audio.status === "ready" ? audio.playing : (audio.status === "unavailable" || audio.status === "error")
  );

  return (
    <>
      <TrainingProgressBar total={steps.length} current={stepIndex} playing={barPlaying} durationMs={audio.status === "ready" ? estimatedMs : NO_AUDIO_DWELL_MS} />

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
        className="fixed right-4 top-8 z-[202] flex h-9 w-9 items-center justify-center rounded-xl bg-card text-muted-foreground shadow-lg hover:text-destructive transition-colors sm:top-10">
        <X size={16} />
      </button>
      <div className="fixed left-4 top-8 z-[202] rounded-xl bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg sm:top-10">
        {moduleTitle}
      </div>

      <audio ref={audio.audioRef} className="hidden" />

      {(!searching || hasRect) && (
        <TrainingTooltip
          step={currentStep}
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
          audioBackend={audio.backend}
          audioPlaying={audio.playing}
          audioMessage={audio.message}
          deviceVoiceMissing={audio.deviceVoiceMissing}
          onToggleAudio={audio.toggle}
          onReplayAudio={audio.replay}
          autoAdvance={autoAdvance}
          onToggleAutoAdvance={() => setAutoAdvance(!autoAdvance)}
          onOpenPractice={() => setPracticeOpen(true)}
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
          onReview={handleReviewStep}
        />
      )}

      {practiceOpen && currentStep.practiceForm && (
        <TrainingPracticeFormModal
          practiceForm={currentStep.practiceForm}
          language={language}
          onClose={() => setPracticeOpen(false)}
          onSubmit={handlePracticeSubmit}
        />
      )}
    </>
  );
}
