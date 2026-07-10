import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Proxies OpenStreetMap Nominatim's reverse-geocoding endpoint — free, no
// API key, no billing (consistent with the rest of the location features
// added alongside this). Done server-side rather than called straight from
// the browser for two reasons: Nominatim's usage policy requires a
// identifying User-Agent, which browsers don't let client-side JS set on
// fetch/XHR requests, and this keeps the app's own request volume/behavior
// consistent regardless of who's calling it.
export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");
  if (!lat || !lng) {
    return NextResponse.json({ error: "Missing lat/lng" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=0`,
      { headers: { "User-Agent": "WanagoERP/1.0 (contact: wanagotourismm@gmail.com)" } }
    );
    if (!res.ok) return NextResponse.json({ error: "Reverse geocoding failed" }, { status: 502 });
    const data = await res.json();
    const address: string | undefined = data?.display_name;
    if (!address) return NextResponse.json({ error: "No address found" }, { status: 404 });
    return NextResponse.json({ address });
  } catch {
    return NextResponse.json({ error: "Reverse geocoding failed" }, { status: 502 });
  }
}
