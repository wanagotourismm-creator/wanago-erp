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

// Synthesized three-note ascending chime — no audio file/asset needed.
// Deliberately loud (gain peaks near unity) and repeated across three notes
// so it cuts through a noisy office / low laptop volume instead of the
// single soft 0.2-gain tone this used to be, which staff reported they
// genuinely couldn't hear. Best-effort: browsers may keep AudioContext
// suspended until the user has interacted with the page at all, which is
// normal well before a notification lands.
// Debounced module-wide: both NotificationBell and PendingNotificationsModal
// run their own useNotifications() subscription, so a single new item can
// trigger this from two places at once — without this guard it'd double-beep.
export function playNotificationSound() {
  const now = Date.now();
  if (now - lastNotificationAt < 1200) return;
  lastNotificationAt = now;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    // Bright ascending triad (A5 -> C#6 -> E6) — reads as an urgent "alert"
    // rather than a gentle chime.
    const notes = [880, 1108.73, 1318.51];
    notes.forEach((freq, i) => {
      const startAt = ctx.currentTime + i * 0.15;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.85, startAt + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + 0.4);
    });
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
