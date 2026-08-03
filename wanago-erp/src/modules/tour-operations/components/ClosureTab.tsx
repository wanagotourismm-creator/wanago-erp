"use client";

import { useState } from "react";
import { Home, MessageSquareHeart, Video, MessageCircleOff, Landmark, Upload } from "lucide-react";
import { uploadFile } from "@/lib/storage/upload";
import { Field, inputClass, SectionCard } from "@/modules/tour-operations/components/shared";
import type { useTourOperation } from "@/modules/tour-operations/hooks/useTourOperation";
import type { Closure } from "@/modules/tour-operations/types";

export function ClosureTab({ recordId, closure, saveClosure }: {
  recordId:    string;
  closure:     Closure;
  saveClosure: ReturnType<typeof useTourOperation>["saveClosure"];
}) {
  const [local, setLocal] = useState(closure);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  async function handleVoiceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVoice(true);
    try {
      const url = await uploadFile(`operations/${recordId}/feedback/${crypto.randomUUID()}-${file.name}`, file);
      setLocal((p) => ({ ...p, feedback: { ...p.feedback, voiceFeedbackUrl: url } }));
    } finally {
      setUploadingVoice(false);
      e.target.value = "";
    }
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    try {
      const url = await uploadFile(`operations/${recordId}/testimonials/${crypto.randomUUID()}-${file.name}`, file);
      setLocal((p) => ({ ...p, testimonialVideo: { ...p.testimonialVideo, videoUrl: url } }));
    } finally {
      setUploadingVideo(false);
      e.target.value = "";
    }
  }

  return (
    <SectionCard title="Package Closure" icon={<Home size={14} className="text-primary" />} onSave={() => saveClosure(local)}>

      <div>
        <p className="mb-2 text-xs font-semibold text-foreground">Customer Reached Home</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Status">
            <select className={inputClass} value={local.customerReachedHome.status} onChange={(e) => setLocal({ ...local, customerReachedHome: { ...local.customerReachedHome, status: e.target.value as Closure["customerReachedHome"]["status"] } })}>
              <option value="">Select</option>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </Field>
          <Field label="Remarks">
            <input className={inputClass} value={local.customerReachedHome.remarks} onChange={(e) => setLocal({ ...local, customerReachedHome: { ...local.customerReachedHome, remarks: e.target.value } })} />
          </Field>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <div className="mb-2 flex items-center gap-2">
          <MessageSquareHeart size={13} className="text-primary" />
          <p className="text-xs font-semibold text-foreground">Feedback Collection</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Status">
            <select className={inputClass} value={local.feedback.status} onChange={(e) => setLocal({ ...local, feedback: { ...local.feedback, status: e.target.value as "collected" | "pending" } })}>
              <option value="pending">Pending</option>
              <option value="collected">Collected</option>
            </select>
          </Field>
          <Field label="Feedback Notes">
            <input className={inputClass} value={local.feedback.notes} onChange={(e) => setLocal({ ...local, feedback: { ...local.feedback, notes: e.target.value } })} />
          </Field>
        </div>
        <Field label="Voice Feedback Upload" className="mt-3">
          <div className="flex items-center gap-2">
            {local.feedback.voiceFeedbackUrl && (
              <a href={local.feedback.voiceFeedbackUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Uploaded file</a>
            )}
            <label className="flex items-center gap-1.5 rounded-lg border border-dashed border-input px-2.5 py-1.5 text-xs text-muted-foreground cursor-pointer hover:border-primary/40">
              <Upload size={12} /> {uploadingVoice ? "Uploading..." : "Upload"}
              <input type="file" accept="audio/*" className="hidden" onChange={handleVoiceUpload} disabled={uploadingVoice} />
            </label>
          </div>
        </Field>
      </div>

      <div className="border-t border-border pt-4">
        <div className="mb-2 flex items-center gap-2">
          <Video size={13} className="text-primary" />
          <p className="text-xs font-semibold text-foreground">Testimonial Video</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Status">
            <select className={inputClass} value={local.testimonialVideo.status} onChange={(e) => setLocal({ ...local, testimonialVideo: { ...local.testimonialVideo, status: e.target.value as "collected" | "pending" } })}>
              <option value="pending">Pending</option>
              <option value="collected">Collected</option>
            </select>
          </Field>
          <Field label="Video Upload">
            <div className="flex items-center gap-2">
              {local.testimonialVideo.videoUrl && (
                <a href={local.testimonialVideo.videoUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Uploaded video</a>
              )}
              <label className="flex items-center gap-1.5 rounded-lg border border-dashed border-input px-2.5 py-1.5 text-xs text-muted-foreground cursor-pointer hover:border-primary/40">
                <Upload size={12} /> {uploadingVideo ? "Uploading..." : "Upload"}
                <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} disabled={uploadingVideo} />
              </label>
            </div>
          </Field>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <div className="mb-2 flex items-center gap-2">
          <MessageCircleOff size={13} className="text-primary" />
          <p className="text-xs font-semibold text-foreground">WhatsApp Group Closing Message</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Status">
            <select className={inputClass} value={local.whatsappClosingMessage.status} onChange={(e) => setLocal({ ...local, whatsappClosingMessage: { ...local.whatsappClosingMessage, status: e.target.value as "sent" | "pending" } })}>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
            </select>
          </Field>
          <Field label="Remarks">
            <input className={inputClass} value={local.whatsappClosingMessage.remarks} onChange={(e) => setLocal({ ...local, whatsappClosingMessage: { ...local.whatsappClosingMessage, remarks: e.target.value } })} />
          </Field>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <div className="mb-2 flex items-center gap-2">
          <Landmark size={13} className="text-primary" />
          <p className="text-xs font-semibold text-foreground">Vendor Payment Clearance</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Status">
            <select className={inputClass} value={local.vendorPaymentClearance.status} onChange={(e) => setLocal({ ...local, vendorPaymentClearance: { ...local.vendorPaymentClearance, status: e.target.value as "completed" | "pending" } })}>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </Field>
          <Field label="Payment Remarks">
            <input className={inputClass} value={local.vendorPaymentClearance.remarks} onChange={(e) => setLocal({ ...local, vendorPaymentClearance: { ...local.vendorPaymentClearance, remarks: e.target.value } })} />
          </Field>
        </div>
      </div>

    </SectionCard>
  );
}
