import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/firebase/admin";
import { getIntegrationFlag } from "@/lib/get-integration-secret";

export const runtime = "nodejs";

function bearerToken(req: NextRequest): string | null {
  return req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
}

// Any authenticated staff member can check this — not admin-only like the
// full Admin -> Integrations read — since a sales agent (not an admin)
// needs to know whether to show the "Call via App" button at all.
export async function GET(req: NextRequest) {
  const caller = await requireAuth(bearerToken(req));
  if (!caller) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const enabled = await getIntegrationFlag("callingEnabled");
  return NextResponse.json({ enabled });
}
