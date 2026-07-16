import { renderPageShell } from "@/modules/itinerary-brochures/pdf-templates/shared";
import { renderCoverPage } from "@/modules/itinerary-brochures/pdf-templates/cover";
import { renderDayPage } from "@/modules/itinerary-brochures/pdf-templates/day";
import { renderInclusionsExclusionsPage } from "@/modules/itinerary-brochures/pdf-templates/inclusions-exclusions";
import { renderTermsPage } from "@/modules/itinerary-brochures/pdf-templates/terms";
import { renderThankYouPage } from "@/modules/itinerary-brochures/pdf-templates/thank-you";
import type { ItineraryBrochure } from "@/modules/itinerary-brochures/types";

// Builds the full multi-page brochure HTML document (cover -> one page per
// day, in order -> inclusions/exclusions -> terms -> thank-you), ready for
// Puppeteer's page.setContent() + page.pdf({ format: "A4" }). Ancillary
// pages (inclusions/exclusions, terms, thank-you) reuse the cover photo as
// their background — there's no separate "back page photo" field in the
// data model, and reusing the cover keeps every page visually tied to the
// same destination without asking the user to upload yet another image.
export function renderBrochureHtml(brochure: ItineraryBrochure, logoDataUri: string, websiteLabel: string): string {
  const pages: string[] = [];

  pages.push(renderCoverPage({
    logoDataUri,
    websiteLabel,
    coverImageUrl:  brochure.coverImageUrl,
    destination:    brochure.destination,
    tagline:        brochure.tagline,
    route:          brochure.route,
    durationDays:   brochure.durationDays,
    durationNights: brochure.durationNights,
    contactPhones:  brochure.contactPhones,
  }));

  for (const day of [...brochure.days].sort((a, b) => a.dayNumber - b.dayNumber)) {
    pages.push(renderDayPage({ logoDataUri, websiteLabel, day }));
  }

  pages.push(renderInclusionsExclusionsPage({
    logoDataUri,
    websiteLabel,
    photoUrl:   brochure.coverImageUrl,
    inclusions: brochure.inclusions,
    exclusions: brochure.exclusions,
  }));

  pages.push(renderTermsPage({
    logoDataUri,
    websiteLabel,
    photoUrl: brochure.coverImageUrl,
    termsAndConditions: brochure.termsAndConditions,
  }));

  pages.push(renderThankYouPage({
    logoDataUri,
    websiteLabel,
    photoUrl:        brochure.coverImageUrl,
    contactPhones:   brochure.contactPhones,
    officeAddresses: brochure.officeAddresses,
  }));

  return renderPageShell(pages);
}
