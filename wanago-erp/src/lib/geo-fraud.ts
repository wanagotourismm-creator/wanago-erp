import { distanceMeters, type GeoPosition } from "@/lib/geo";
import { toDate } from "@/lib/utils/helpers";
import type { AttendanceRecord } from "@/modules/hrms/shared/types";

const MIN_PLAUSIBLE_ACCURACY_METERS = 1;
const IMPOSSIBLE_SPEED_KMH = 250;
const IMPOSSIBLE_SPEED_MIN_GAP_HOURS = 0.05; // ~3 minutes, avoids a near-zero-gap divide blowing up the implied speed
const REPEATED_COORDINATE_LOOKBACK = 5;
const REPEATED_COORDINATE_MIN_MATCHES = 3;

export type SuspicionReason =
  | "accuracy_too_precise"
  | "impossible_travel_speed"
  | "identical_coordinates_repeated";

export const SUSPICION_REASON_LABELS: Record<SuspicionReason, string> = {
  accuracy_too_precise: "GPS accuracy was suspiciously exact for a consumer device (possible location spoofing)",
  impossible_travel_speed: "Implied travel speed since their last recorded position is physically impossible",
  identical_coordinates_repeated: "Reported the exact same coordinates as several recent attempts in a row",
};

// Heuristic only, never a certainty — a web browser has no API to ask "is
// this GPS reading mocked" the way a native Android/iOS app can (Android's
// Location.isFromMockProvider() isn't exposed to web JS at all). These are
// red flags for HR review, not proof of spoofing.
export function detectSuspiciousLocation(params: {
  pos: GeoPosition;
  action: "check_in" | "check_out";
  recentRecords: AttendanceRecord[]; // this employee's records, excluding today, newest first
}): SuspicionReason[] {
  const { pos, action, recentRecords } = params;
  const reasons: SuspicionReason[] = [];

  if (pos.accuracy != null && pos.accuracy < MIN_PLAUSIBLE_ACCURACY_METERS) {
    reasons.push("accuracy_too_precise");
  }

  const latKey = action === "check_in" ? "clockInLat" : "clockOutLat";
  const lngKey = action === "check_in" ? "clockInLng" : "clockOutLng";

  const lastWithCoords = recentRecords.find((r) => r[latKey] != null && r[lngKey] != null);
  if (lastWithCoords) {
    const lastLat = lastWithCoords[latKey] as number;
    const lastLng = lastWithCoords[lngKey] as number;
    const lastTime = toDate(lastWithCoords.updatedAt) ?? toDate(lastWithCoords.createdAt);
    if (lastTime) {
      const hoursElapsed = Math.max((Date.now() - lastTime.getTime()) / 3_600_000, IMPOSSIBLE_SPEED_MIN_GAP_HOURS);
      const distanceKm = distanceMeters(pos.lat, pos.lng, lastLat, lastLng) / 1000;
      const impliedSpeedKmh = distanceKm / hoursElapsed;
      if (impliedSpeedKmh > IMPOSSIBLE_SPEED_KMH) {
        reasons.push("impossible_travel_speed");
      }
    }
  }

  const recentWithCoords = recentRecords
    .slice(0, REPEATED_COORDINATE_LOOKBACK)
    .filter((r) => r[latKey] != null && r[lngKey] != null);
  const identicalCount = recentWithCoords.filter((r) => r[latKey] === pos.lat && r[lngKey] === pos.lng).length;
  if (identicalCount >= REPEATED_COORDINATE_MIN_MATCHES) {
    reasons.push("identical_coordinates_repeated");
  }

  return reasons;
}
