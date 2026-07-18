// Framework-agnostic — shared by the client attendance service (manual HR
// entries) and the server-side clock-in/out API route, so both compute
// hours the same way.
export type HoursResult = { hoursWorked: number | null; needsReview: boolean };

const MAX_SANE_SHIFT_MINUTES = 16 * 60;

export function calcHours(clockIn?: string | null, clockOut?: string | null, breakMinutes = 0): HoursResult {
  if (!clockIn || !clockOut) return { hoursWorked: null, needsReview: false };
  const [inH, inM] = clockIn.split(":").map(Number);
  const [outH, outM] = clockOut.split(":").map(Number);
  let minutes = (outH * 60 + outM) - (inH * 60 + inM);
  // Overnight shift (e.g. clockIn 22:00, clockOut 06:00) — clockOut's
  // time-of-day is numerically earlier than clockIn's, so the raw
  // subtraction goes negative even though the employee worked a real,
  // positive duration overnight. Assume a single midnight crossing.
  if (minutes < 0) minutes += 24 * 60;
  minutes -= breakMinutes;
  // A wrap that still comes out implausibly long (forgotten checkout that
  // rolled into the next day, bad manual entry, etc.) shouldn't be reported
  // as a real number of hours worked — flag it for a human instead of
  // silently showing something like "22.5h".
  if (minutes > MAX_SANE_SHIFT_MINUTES) return { hoursWorked: null, needsReview: true };
  if (minutes <= 0) return { hoursWorked: null, needsReview: false };
  return { hoursWorked: Math.round((minutes / 60) * 100) / 100, needsReview: false };
}
