"use client";

// Samples still frames from a screen-recording File entirely in the browser
// (hidden <video> + <canvas>) — there's no ffmpeg/video processing on the
// Vercel serverless side this app runs on, so this is the only practical
// way to turn a screen recording into images the AI vision model
// (Gemini, image-only) can actually analyze. Called right after a video is
// attached to a ticket report; see ticket.service.ts's uploadTicketAttachments.
const DEFAULT_MAX_FRAMES = 6;

export async function extractVideoFrames(file: File, maxFrames = DEFAULT_MAX_FRAMES): Promise<Blob[]> {
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;
  const objectUrl = URL.createObjectURL(file);
  video.src = objectUrl;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Couldn't read video metadata"));
    });

    const duration = video.duration;
    if (!isFinite(duration) || duration <= 0) return [];

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];

    const frameCount = Math.min(maxFrames, Math.max(1, Math.floor(duration)));
    const frames: Blob[] = [];

    for (let i = 0; i < frameCount; i++) {
      const t = (duration / (frameCount + 1)) * (i + 1);
      await new Promise<void>((resolve, reject) => {
        const onSeeked = () => { video.removeEventListener("seeked", onSeeked); resolve(); };
        const onError = () => { video.removeEventListener("seeked", onSeeked); reject(new Error("Seek failed")); };
        video.addEventListener("seeked", onSeeked);
        video.addEventListener("error", onError, { once: true });
        video.currentTime = t;
      });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
      if (blob) frames.push(blob);
    }

    return frames;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
