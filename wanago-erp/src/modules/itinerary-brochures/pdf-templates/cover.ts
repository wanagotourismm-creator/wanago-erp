import { escapeHtml, renderHeaderFooter } from "@/modules/itinerary-brochures/pdf-templates/shared";

export function renderCoverPage(params: {
  logoDataUri:    string;
  websiteLabel:   string;
  coverImageUrl:  string;
  destination:    string;
  tagline:        string | null;
  route:          string | null;
  durationDays:   number;
  durationNights: number;
  contactPhones:  string[];
}): string {
  const { header } = renderHeaderFooter(params.logoDataUri, params.websiteLabel);
  const primaryPhone = params.contactPhones[0] ?? "";

  return `
  <div class="page">
    <div class="bg-photo ${params.coverImageUrl ? "" : "placeholder"}"
         style="${params.coverImageUrl ? `background-image:url('${params.coverImageUrl}')` : ""}"></div>
    <div class="gradient-dark-full"></div>

    ${header}

    <div style="position:absolute; top:230px; left:40px; right:40px; text-align:center;">
      ${params.tagline ? `<p style="font-size:14px; color:#e6ecf1; margin-bottom:14px;">${escapeHtml(params.tagline)}</p>` : ""}
      <h1 style="font-family:'Playfair Display',Georgia,serif; font-style:italic; font-weight:600; font-size:76px; line-height:1;">
        ${escapeHtml(params.destination)}
      </h1>
      ${params.route ? `<p style="font-family:'Playfair Display',Georgia,serif; font-size:22px; margin-top:10px;">${escapeHtml(params.route)}</p>` : ""}
    </div>

    <div class="footer-row" style="align-items:flex-end;">
      <div class="badge-pill">
        <b>${String(params.durationDays).padStart(2, "0")}</b> Days |
        <b>${String(params.durationNights).padStart(2, "0")}</b> Nights
      </div>
      <div class="booking-block">
        <div class="label">For Booking &amp; Enquiry</div>
        ${primaryPhone ? `<div class="phone">${escapeHtml(primaryPhone)}</div>` : ""}
      </div>
    </div>
  </div>`;
}
