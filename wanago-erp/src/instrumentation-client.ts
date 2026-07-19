import * as Sentry from "@sentry/nextjs";

// Points at GlitchTip (self-hosted, Sentry-protocol-compatible) by default —
// swap NEXT_PUBLIC_ERROR_TRACKING_DSN for a sentry.io DSN with zero code
// changes if that's ever preferred instead. Unset DSN = SDK silently no-ops,
// so this is safe to ship even before an instance is provisioned.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_ERROR_TRACKING_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_RELEASE_SHA,
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
