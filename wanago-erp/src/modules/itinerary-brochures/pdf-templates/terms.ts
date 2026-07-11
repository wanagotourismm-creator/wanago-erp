import { escapeHtml, renderHeaderFooter } from "@/modules/itinerary-brochures/pdf-templates/shared";

// Splits the freeform T&C block into numbered-clause chunks: a "1. Title"
// line starts a new clause, everything until the next numbered line is its
// body. Falls back to one unstructured block if the text doesn't follow
// that convention (e.g. fully custom text pasted in by the user).
function parseClauses(text: string): { title: string; body: string }[] {
  const lines = text.split("\n");
  const clauses: { title: string; body: string }[] = [];
  let current: { title: string; body: string[] } | null = null;

  for (const line of lines) {
    const match = line.match(/^\s*(\d+)\.\s*(.+)$/);
    if (match) {
      if (current) clauses.push({ title: current.title, body: current.body.join(" ").trim() });
      current = { title: `${match[1]}. ${match[2]}`, body: [] };
    } else if (current) {
      if (line.trim()) current.body.push(line.trim());
    }
  }
  if (current) clauses.push({ title: current.title, body: current.body.join(" ").trim() });

  return clauses.length > 0 ? clauses : [{ title: "Terms & Conditions", body: text }];
}

export function renderTermsPage(params: {
  logoDataUri: string;
  photoUrl:    string;
  termsAndConditions: string;
}): string {
  const { footer } = renderHeaderFooter(params.logoDataUri);
  const clauses = parseClauses(params.termsAndConditions);

  const clauseHtml = clauses.map((c) => `
    <div style="margin-bottom:11px;">
      <p style="font-size:11.5px; font-weight:700; margin-bottom:2px;">${escapeHtml(c.title)}</p>
      <p style="font-size:10.5px; line-height:1.55; color:#dbe3ea;">${escapeHtml(c.body)}</p>
    </div>`).join("");

  return `
  <div class="page">
    <div class="bg-photo ${params.photoUrl ? "" : "placeholder"}"
         style="${params.photoUrl ? `background-image:url('${params.photoUrl}')` : ""}"></div>
    <div class="gradient-dark-full"></div>

    <div style="position:absolute; top:48px; left:40px; right:40px; z-index:2;">
      <h2 style="font-weight:700; font-size:26px; border-left:3px solid #fff; padding-left:10px; margin-bottom:22px;">
        Terms &amp; Conditions
      </h2>
      <div style="background:rgba(8,14,20,0.55); border-radius:14px; padding:20px 22px; max-height:960px; overflow:hidden;">
        ${clauseHtml}
      </div>
    </div>

    ${footer}
  </div>`;
}
