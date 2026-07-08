let audioCtx: AudioContext | null = null;
let lastNotificationAt = 0;
let lastMessageAt = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

// Synthesized two-tone chime — no audio file/asset needed. Best-effort:
// browsers may keep AudioContext suspended until the user has interacted
// with the page at all, which is normal well before a notification lands.
// Debounced module-wide: both NotificationBell and PendingNotificationsModal
// run their own useNotifications() subscription, so a single new item can
// trigger this from two places at once — without this guard it'd double-beep.
export function playNotificationSound() {
  const now = Date.now();
  if (now - lastNotificationAt < 1000) return;
  lastNotificationAt = now;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
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

// A short, percussive double-knock for Team Space chat messages — deliberately
// distinct in character from the notification chime above (lower, two quick
// soft taps rather than a rising tone) so the two are easy to tell apart by
// ear, similar in spirit to how chat apps use a different tone for messages.
export function playMessageSound() {
  const now = Date.now();
  if (now - lastMessageAt < 800) return;
  lastMessageAt = now;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const knock = (startAt: number, freq: number, peak: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + 0.12);
    };
    knock(ctx.currentTime, 660, 0.18);
    knock(ctx.currentTime + 0.1, 520, 0.14);
  } catch {
    // Never let a playback failure break the UI.
  }
}
