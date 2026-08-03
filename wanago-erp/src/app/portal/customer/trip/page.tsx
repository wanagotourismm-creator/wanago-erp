"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, Calendar, IdCard, MessageSquareHeart, Video, CheckCircle2, Upload } from "lucide-react";
import { PortalShell } from "@/modules/portal/components/PortalShell";
import {
  fetchMyTrip, uploadTripIdCard, submitTripFeedback, uploadTripTestimonial, type MyTrip,
} from "@/modules/portal/services/trip-portal.service";
import { formatDate } from "@/lib/utils/helpers";

function TripDashboard() {
  const [trip, setTrip] = useState<MyTrip | null>(null);
  const [loading, setLoading] = useState(true);

  const [uploadingIdCard, setUploadingIdCard] = useState(false);
  const [idCardError, setIdCardError] = useState<string | null>(null);

  const [notes, setNotes] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetchMyTrip().then(setTrip).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleIdCardUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !trip?.opsId) return;
    setUploadingIdCard(true);
    setIdCardError(null);
    const { error } = await uploadTripIdCard(trip.opsId, file);
    setUploadingIdCard(false);
    e.target.value = "";
    if (error) setIdCardError(error);
    else load();
  }

  async function handleFeedbackSubmit() {
    if (!trip?.opsId || !notes.trim()) return;
    setSubmittingFeedback(true);
    setFeedbackError(null);
    const { error } = await submitTripFeedback(trip.opsId, notes);
    setSubmittingFeedback(false);
    if (error) setFeedbackError(error);
    else { setNotes(""); load(); }
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !trip?.opsId) return;
    setUploadingVideo(true);
    setVideoError(null);
    const { error } = await uploadTripTestimonial(trip.opsId, file);
    setUploadingVideo(false);
    e.target.value = "";
    if (error) setVideoError(error);
    else load();
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 size={22} className="animate-spin text-primary" /></div>;
  }

  if (!trip?.booking) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-12 text-center">
        <p className="text-sm text-muted-foreground">No active or upcoming trip to show right now.</p>
      </div>
    );
  }

  const { booking } = trip;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">My Trip</h1>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <MapPin size={11} /> {booking.destination} · {booking.refNumber}
        </p>
        {booking.travelDate && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar size={11} /> {formatDate(booking.travelDate)}{booking.returnDate ? ` – ${formatDate(booking.returnDate)}` : ""}
          </p>
        )}
      </div>

      {!trip.tripReady ? (
        <div className="rounded-2xl border border-dashed border-border py-10 text-center">
          <p className="text-sm text-muted-foreground">We&apos;re getting your trip set up — check back soon for updates, document upload, and more.</p>
        </div>
      ) : (
        <>
          {/* Status banner */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-foreground">{trip.friendlyStatus}</p>
          </div>

          {/* ID card upload */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2">
              <IdCard size={14} className="text-primary" />
              <p className="text-sm font-semibold text-foreground">ID Documents</p>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              {trip.idCardCount ? `${trip.idCardCount} document${trip.idCardCount === 1 ? "" : "s"} uploaded.` : "Upload an attested copy of your ID for each traveller."}
            </p>
            <label className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-input py-2.5 text-xs font-medium text-muted-foreground cursor-pointer hover:border-primary/40">
              <Upload size={13} />
              {uploadingIdCard ? "Uploading..." : "Upload ID Document"}
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleIdCardUpload} disabled={uploadingIdCard} />
            </label>
            {idCardError && <p className="mt-2 text-xs font-medium text-destructive">{idCardError}</p>}
          </div>

          {/* Post-trip feedback + testimonial */}
          {trip.canSubmitFeedback && (
            <>
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-2 flex items-center gap-2">
                  <MessageSquareHeart size={14} className="text-primary" />
                  <p className="text-sm font-semibold text-foreground">How was your trip?</p>
                </div>
                {trip.feedbackStatus === "collected" ? (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                    <CheckCircle2 size={13} /> Thanks — we&apos;ve received your feedback.
                  </p>
                ) : (
                  <>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Tell us about your trip..."
                      className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    {feedbackError && <p className="mt-2 text-xs font-medium text-destructive">{feedbackError}</p>}
                    <button
                      onClick={handleFeedbackSubmit}
                      disabled={submittingFeedback || !notes.trim()}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
                    >
                      {submittingFeedback && <Loader2 size={14} className="animate-spin" />}
                      Submit Feedback
                    </button>
                  </>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Video size={14} className="text-primary" />
                  <p className="text-sm font-semibold text-foreground">Share a Testimonial</p>
                </div>
                {trip.testimonialStatus === "collected" ? (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                    <CheckCircle2 size={13} /> Thanks for sharing your testimonial video!
                  </p>
                ) : (
                  <>
                    <label className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-input py-2.5 text-xs font-medium text-muted-foreground cursor-pointer hover:border-primary/40">
                      <Upload size={13} />
                      {uploadingVideo ? "Uploading..." : "Upload a Short Video"}
                      <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} disabled={uploadingVideo} />
                    </label>
                    {videoError && <p className="mt-2 text-xs font-medium text-destructive">{videoError}</p>}
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function TripPortalPage() {
  return (
    <PortalShell requiredType="customer" title="My Trip">
      <TripDashboard />
    </PortalShell>
  );
}
