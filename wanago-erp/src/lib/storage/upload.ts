"use client";

import { auth } from "@/lib/firebase/client";

// Drop-in replacement for the old `ref(storage, path); uploadBytes(...);
// getDownloadURL()` three-step Firebase pattern — every browser-side
// upload call site in the app was migrated to call this instead, now that
// Firebase Storage is unusable until the project's Blaze plan is
// activated (see /api/storage/upload for why). Uploads are proxied
// through that route to Supabase Storage's free tier.
export async function uploadFile(path: string, file: File | Blob): Promise<string> {
  const idToken = await auth.currentUser?.getIdToken();
  const form = new FormData();
  form.set("path", path);
  form.set("file", file, path.split("/").pop());

  const res = await fetch("/api/storage/upload", {
    method: "POST",
    headers: idToken ? { authorization: `Bearer ${idToken}` } : {},
    body: form,
  });
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.url as string;
}

// Drop-in replacement for `listAll(ref(storage, prefix))` — lists every
// file previously uploaded under a folder prefix.
export async function listFiles(prefix: string): Promise<string[]> {
  const idToken = await auth.currentUser?.getIdToken();
  const res = await fetch(`/api/storage/list?prefix=${encodeURIComponent(prefix)}`, {
    headers: idToken ? { authorization: `Bearer ${idToken}` } : {},
  });
  if (!res.ok) throw new Error("Failed to list files");
  const data = await res.json();
  return data.urls as string[];
}
