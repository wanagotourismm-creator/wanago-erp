"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

export function ServiceWorkerRegister() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        registration = reg;

        // A new worker finishing installation while an existing one is
        // already controlling the page means this is an update (not the
        // very first install) — surface it instead of applying it silently,
        // so nobody loses unsaved form input to an unannounced reload.
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateReady(true);
            }
          });
        });
      })
      .catch(() => {});

    // Browsers only check for a new service worker occasionally on their
    // own (and rarely at all if the installed app is left open for a long
    // time without a full navigation) — poll manually so a deploy is
    // noticed promptly instead of only on the next cold start.
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") registration?.update().catch(() => {});
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  if (!updateReady) return null;

  return (
    <button
      onClick={() => window.location.reload()}
      className="fixed bottom-20 left-1/2 z-[100] -translate-x-1/2 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-xl transition-transform hover:scale-105 lg:bottom-6"
    >
      <RefreshCw size={14} />
      Update available — tap to refresh
    </button>
  );
}
