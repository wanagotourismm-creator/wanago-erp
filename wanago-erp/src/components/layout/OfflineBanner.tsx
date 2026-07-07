"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

// Purely client-side connectivity check (navigator.onLine + the browser's
// online/offline events) — no service worker involvement needed, since the
// SW registered elsewhere is a pure no-op passthrough with no caching.
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const goOffline = () => setOffline(true);
    const goOnline  = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-xs font-medium text-white">
      <WifiOff size={13} />
      You&apos;re offline — changes won&apos;t save until you&apos;re back online.
    </div>
  );
}
