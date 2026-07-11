import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only. There is no browser-facing Supabase client anywhere in
// this app — Firebase Auth remains the sole login system, and this
// Supabase project is a narrow, write-only-from-the-server reporting
// mirror (Customers + Bookings, cohort/retention reporting only), not a
// general database the client talks to directly. Never import this from
// a "use client" component.
//
// Uses the service role key, which bypasses Row Level Security entirely
// — that's fine here because this key is never sent to the browser; the
// actual "only Admin/Finance can read" boundary is enforced one layer up,
// by the API routes that call getSupabaseAdmin() checking the caller's
// Firebase ID token (see requireAdminOrFinance in lib/firebase/admin.ts)
// before ever touching Supabase. RLS is enabled on both mirrored tables
// as defense-in-depth against a leaked anon/publishable key that this
// project doesn't currently issue to anyone.
let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
