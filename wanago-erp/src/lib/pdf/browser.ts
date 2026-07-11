import type { Browser } from "puppeteer-core";

// Vercel's serverless functions run on Amazon Linux without a system
// Chrome, and the full "puppeteer" package's bundled Chromium is both too
// large for the deploy bundle and built for the wrong OS. @sparticuz/chromium
// ships a Lambda-compatible Chromium binary for that environment.
// Locally (Windows/Mac dev), the full "puppeteer" devDependency already
// bundles a Chromium that matches the local OS, so we use that instead —
// @sparticuz/chromium's Linux binary can't run on a Windows dev machine.
export async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteer = await import("puppeteer-core");
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const puppeteer = (await import("puppeteer")).default;
  return puppeteer.launch({ headless: true }) as unknown as Promise<Browser>;
}
