import { escapeHtml, renderHeaderFooter } from "@/modules/itinerary-brochures/pdf-templates/shared";
import type { BrochureDay } from "@/modules/itinerary-brochures/types";

export function renderDayPage(params: {
  logoDataUri:  string;
  websiteLabel: string;
  day:          BrochureDay;
}): string {
  const { footer } = renderHeaderFooter(params.logoDataUri, params.websiteLabel);
  const { day } = params;

  const bullets = day.bulletPoints.map((point) => {
    // Sample PDFs bold the key noun phrase in some bullets (e.g. "**Phi Phi
    // Island Tour** by speed boat") — a plain "Label: rest" bullet renders
    // the part before the first colon in bold, everything else stays regular.
    const colonIndex = point.indexOf(":");
    if (colonIndex > -1 && colonIndex < 40) {
      const label = point.slice(0, colonIndex + 1);
      const rest = point.slice(colonIndex + 1);
      return `<li><b>${escapeHtml(label)}</b>${escapeHtml(rest)}</li>`;
    }
    return `<li>${escapeHtml(point)}</li>`;
  }).join("");

  return `
  <div class="page" style="background:#05070a;">
    <div class="bg-photo ${day.imageUrl ? "" : "placeholder"}"
         style="${day.imageUrl ? `background-image:url('${day.imageUrl}')` : ""}; top:520px; height:603px;"></div>
    <div class="gradient-dark-top-fade" style="height:560px;"></div>

    <div style="position:absolute; top:64px; left:40px; right:40px; z-index:2;">
      <p style="font-size:15px; font-weight:600; color:#fff; border-left:3px solid #fff; padding-left:10px; margin-bottom:18px;">
        Day ${String(day.dayNumber).padStart(2, "0")}
      </p>
      <h2 style="font-family:'Poppins',sans-serif; font-weight:700; font-size:28px; margin-bottom:20px;">
        ${escapeHtml(day.title)}
      </h2>
      <ul style="list-style:disc; padding-left:20px; font-size:14px; line-height:1.9; color:#e9edf1;">
        ${bullets}
      </ul>
    </div>

    ${footer}
  </div>`;
}
