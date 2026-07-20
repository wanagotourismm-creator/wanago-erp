"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, Star } from "lucide-react";
import { cn } from "@/lib/utils/helpers";

type LinkData = {
  customerName:     string;
  destination:      string;
  bookingRefNumber: string;
  alreadySubmitted: boolean;
};

export default function ReviewPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<LinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{ category: string; googleReviewUrl: string | null } | null>(null);

  useEffect(() => {
    fetch(`/api/public/review/${params.token}`)
      .then(async (res) => {
        if (!res.ok) { setNotFound(true); return; }
        setData(await res.json());
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.token]);

  async function handleSubmit() {
    if (score == null) { setSubmitError("Please pick a score from 0 to 10."); return; }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/public/review/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, comment }),
      });
      const json = await res.json();
      if (!res.ok) { setSubmitError(json.error ?? "Something went wrong. Please try again."); return; }
      setResult(json);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="text-muted-foreground">This link isn&apos;t valid or has expired.</p>
      </div>
    );
  }

  const showThankYou = data.alreadySubmitted || result;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-sm">
        {showThankYou ? (
          <div className="flex flex-col items-center text-center">
            <CheckCircle2 size={40} className="mb-4 text-green-600" />
            <h1 className="mb-2 text-xl font-bold text-foreground">Thank you!</h1>
            <p className="text-sm text-muted-foreground">
              {data.alreadySubmitted
                ? "We already have your feedback for this trip."
                : "Your feedback means a lot to us."}
            </p>
            {result?.googleReviewUrl && (
              <a
                href={result.googleReviewUrl}
                target="_blank" rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
              >
                <Star size={16} /> Leave us a Google review
              </a>
            )}
          </div>
        ) : (
          <>
            <h1 className="mb-1 text-xl font-bold text-foreground">Hi {data.customerName}!</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              How was your trip to {data.destination} ({data.bookingRefNumber})? On a scale of 0–10, how likely are you to recommend us to a friend?
            </p>

            <div className="mb-2 flex flex-wrap gap-2">
              {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                <button
                  key={n}
                  onClick={() => setScore(n)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-semibold transition-colors",
                    score === n
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-background text-foreground hover:border-primary/40"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mb-6 flex justify-between text-[11px] text-muted-foreground">
              <span>Not likely</span>
              <span>Extremely likely</span>
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Anything you'd like to share? (optional)"
              rows={3}
              className="mb-4 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />

            {submitError && (
              <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {submitError}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : "Submit Feedback"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
