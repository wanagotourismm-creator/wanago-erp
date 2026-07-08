let audioCtx: AudioContext | null = null;
let lastPlayedAt = 0;

// Synthesized two-tone chime — no audio file/asset needed. Best-effort:
// browsers may keep AudioContext suspended until the user has interacted
// with the page at all, which is normal well before a notification lands.
// Debounced module-wide: both NotificationBell and PendingNotificationsModal
// run their own useNotifications() subscription, so a single new item can
// trigger this from two places at once — without this guard it'd double-beep.
export function playNotificationSound() {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - lastPlayedAt < 1000) return;
  lastPlayedAt = now;
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new Ctx();
    }
    const ctx = audioCtx;
    if (ctx.state === "suspended") ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Never let a playback failure break the UI.
  }
}
