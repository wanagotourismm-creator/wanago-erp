import { escapeHtml, renderHeaderFooter } from "@/modules/itinerary-brochures/pdf-templates/shared";

export function renderInclusionsExclusionsPage(params: {
  logoDataUri:  string;
  websiteLabel: string;
  photoUrl:     string;
  inclusions:   string[];
  exclusions:   string[];
}): string {
  const { footer } = renderHeaderFooter(params.logoDataUri, params.websiteLabel);

  const list = (items: string[]) =>
    items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

  return `
  <div class="page">
    <div class="bg-photo ${params.photoUrl ? "" : "placeholder"}"
         style="${params.photoUrl ? `background-image:url('${params.photoUrl}')` : ""}"></div>
    <div class="gradient-dark-full"></div>

    <div style="position:absolute; top:56px; left:40px; right:40px; z-index:2;">
      <h2 style="font-weight:700; font-size:26px; border-left:3px solid #fff; padding-left:10px; margin-bottom:22px;">
        Inclusion
      </h2>
      <ul style="list-style:disc; padding-left:20px; font-size:13px; line-height:2; font-weight:600; color:#fff; margin-bottom:34px;">
        ${list(params.inclusions)}
      </ul>

      <h2 style="font-weight:700; font-size:26px; border-left:3px solid #fff; padding-left:10px; margin-bottom:22px;">
        Exclusion
      </h2>
      <ul style="list-style:disc; padding-left:20px; font-size:13px; line-height:2; font-weight:600; color:#fff;">
        ${list(params.exclusions)}
      </ul>
    </div>

    ${footer}
  </div>`;
}
