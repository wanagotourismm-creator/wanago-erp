"use client";

import { ErrorFallback } from "@/components/shared/ErrorFallback";
import "@/styles/globals.css";

// Only fires if the root layout itself throws (a normal page/route error
// never reaches here — see error.tsx) — Next.js requires this file to
// render its own <html>/<body> since it replaces the layout entirely,
// which is why it imports globals.css directly instead of relying on it
// having already loaded.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <ErrorFallback error={error} reset={reset} />
      </body>
    </html>
  );
}
