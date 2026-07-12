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
};

export default nextConfig;
