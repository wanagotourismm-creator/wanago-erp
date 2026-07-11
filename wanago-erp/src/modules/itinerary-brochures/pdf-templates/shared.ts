// Shared page shell + typography for the brochure PDF templates. Pages are
// sized to exact A4 dimensions at 96dpi (794x1123px) so Puppeteer's
// `page.pdf({ format: "A4" })` maps 1:1 onto this layout with no scaling
// surprises. Each template module renders one page's inner content; this
// wraps it with the fixed page box + page-break rule Puppeteer needs to
// split multi-page HTML into a multi-page PDF.

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const BRAND_FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,500&family=Poppins:wght@400;500;600;700&display=swap');`;

export const PAGE_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 794px; }
  body { font-family: 'Poppins', sans-serif; color: #fff; background: #0a0e14; }

  .page {
    position: relative;
    width: 794px;
    height: 1123px;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
  }
  .page:last-child { page-break-after: auto; break-after: auto; }

  .bg-photo {
    position: absolute; inset: 0;
    background-size: cover;
    background-position: center;
  }
  .bg-photo.placeholder {
    background: linear-gradient(160deg, #1b2838 0%, #33506b 45%, #6f92a8 100%);
  }

  .gradient-dark-full {
    position: absolute; inset: 0;
    background: linear-gradient(180deg, #05070a 0%, #0d1a2b 30%, rgba(20,40,60,0.35) 65%, rgba(10,15,20,0.75) 100%);
  }
  .gradient-dark-bottom {
    position: absolute; inset: 0;
    background: linear-gradient(180deg, #05070a 0%, #05070a 42%, rgba(5,7,10,0.15) 60%, rgba(5,7,10,0) 68%);
  }
  .gradient-dark-top-fade {
    position: absolute; left: 0; right: 0; top: 0; height: 300px;
    background: linear-gradient(180deg, #05070a 0%, rgba(5,7,10,0.85) 55%, rgba(5,7,10,0) 100%);
  }

  .logo { height: 22px; }
  .site-label { font-size: 13px; font-weight: 500; letter-spacing: 0.02em; color: #fff; }

  .header-row {
    position: absolute; top: 32px; left: 40px; right: 40px;
    display: flex; align-items: center; justify-content: space-between;
    z-index: 2;
  }
  .footer-row {
    position: absolute; bottom: 28px; left: 40px; right: 40px;
    display: flex; align-items: center; justify-content: space-between;
    z-index: 2;
  }

  .badge-pill {
    display: inline-flex; align-items: baseline; gap: 6px;
    font-size: 20px; font-weight: 700;
  }
  .badge-pill b { font-weight: 800; }

  .booking-block { text-align: right; }
  .booking-block .label { font-size: 11px; color: rgba(255,255,255,0.75); }
  .booking-block .phone { font-size: 20px; font-weight: 700; }
`;

export function renderPageShell(pagesHtml: string[]): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  ${BRAND_FONT_IMPORT}
  ${PAGE_STYLES}
</style>
</head>
<body>
${pagesHtml.join("\n")}
</body>
</html>`;
}

export function renderHeaderFooter(logoDataUri: string, websiteLabel = "www.wanago.in"): { header: string; footer: string } {
  const header = `
    <div class="header-row">
      <img class="logo" src="${logoDataUri}" alt="Wanago" />
      <span class="site-label">${escapeHtml(websiteLabel)}</span>
    </div>`;
  const footer = `
    <div class="footer-row">
      <img class="logo" src="${logoDataUri}" alt="Wanago" />
      <span class="site-label">${escapeHtml(websiteLabel)}</span>
    </div>`;
  return { header, footer };
}
