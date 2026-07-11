import { escapeHtml, renderHeaderFooter } from "@/modules/itinerary-brochures/pdf-templates/shared";

export function renderThankYouPage(params: {
  logoDataUri:     string;
  photoUrl:        string;
  contactPhones:   string[];
  officeAddresses: string[];
}): string {
  const { header } = renderHeaderFooter(params.logoDataUri);

  const phonesHtml = params.contactPhones
    .map((phone) => `<p style="font-size:14px; font-weight:700;">${escapeHtml(phone)}</p>`)
    .join("");

  const addressesHtml = params.officeAddresses
    .map((addr, i) => `<p style="font-size:11px; color:#dbe3ea; line-height:1.5; margin-bottom:${i < params.officeAddresses.length - 1 ? "10px" : "0"};">${escapeHtml(addr)}</p>`)
    .join("");

  return `
  <div class="page">
    <div class="bg-photo ${params.photoUrl ? "" : "placeholder"}"
         style="${params.photoUrl ? `background-image:url('${params.photoUrl}')` : ""}"></div>
    <div class="gradient-dark-full"></div>

    ${header}

    <div style="position:absolute; top:340px; left:0; right:0; text-align:center;">
      <p style="font-family:'Poppins',sans-serif; font-weight:800; font-size:64px; line-height:1.05; letter-spacing:0.02em;">
        THANK<br />YOU
      </p>
    </div>

    <div class="footer-row" style="align-items:flex-end;">
      <div>
        ${addressesHtml}
      </div>
      <div style="text-align:right;">
        <p style="font-size:11px; color:rgba(255,255,255,0.75); margin-bottom:4px;">For Booking &amp; Enquiry</p>
        ${phonesHtml}
      </div>
    </div>
  </div>`;
}
