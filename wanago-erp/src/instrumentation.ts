import * as Sentry from "@sentry/nextjs";

// Next.js calls register() once per server/edge runtime on boot — this is
// the single init point for both, replacing the older sentry.server.config /
// sentry.edge.config file pair. See instrumentation-client.ts for the
// browser-side init.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.ERROR_TRACKING_DSN,
      environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV,
      release: process.env.NEXT_PUBLIC_RELEASE_SHA,
      tracesSampleRate: 0.2,
    });
  }
}

// Wires uncaught errors from Server Components, Route Handlers, and Server
// Actions into the same DSN — without this, only client-side throws (caught
// by error.tsx) would ever reach error tracking.
export const onRequestError = Sentry.captureRequestError;
