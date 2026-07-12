import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

export default nextConfig;
