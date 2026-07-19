import path from "path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // A lockfile one level up (outside this project) makes Next.js guess a
  // monorepo root there instead of here, which throws off output file
  // tracing. This project's own directory is always the real root.
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // @sparticuz/chromium ships its Chromium binary as loose files under
  // node_modules/@sparticuz/chromium/bin — Next.js's default server bundling
  // relocates/tree-shakes those away, which is exactly the "input directory
  // does not exist" error Puppeteer hit in production. Marking both packages
  // external keeps them untouched in node_modules at runtime instead.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // serverExternalPackages alone stops the package's JS from being bundled,
  // but Next.js's output file tracer still decides which node_modules files
  // actually get copied into the deployed function — and it can't see the
  // chromium binary because @sparticuz/chromium only reaches it via a
  // runtime fs read, not a static import/require the tracer can follow.
  // This explicitly forces those files into this one route's function.
  outputFileTracingIncludes: {
    "/api/itinerary-brochures/[id]/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

// Wraps the build with Sentry's webpack plugin to upload sourcemaps and
// create a release marker — both no-ops (with a build-time warning, not a
// failure) until ERROR_TRACKING_AUTH_TOKEN is set, so this is safe pre-setup.
// SENTRY_URL must point at the self-hosted GlitchTip instance's base URL
// (GlitchTip implements the same releases/artifacts API Sentry's CLI uses).
export default withSentryConfig(nextConfig, {
  org: process.env.ERROR_TRACKING_ORG,
  project: process.env.ERROR_TRACKING_PROJECT,
  authToken: process.env.ERROR_TRACKING_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  webpack: {
    treeshake: { removeDebugLogging: true },
  },
  sourcemaps: {
    disable: !process.env.ERROR_TRACKING_AUTH_TOKEN,
  },
});
