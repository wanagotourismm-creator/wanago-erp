// Default boilerplate a new brochure starts from — editable per-itinerary,
// not enforced. Sourced from the existing Wanago sample PDFs so every new
// brochure begins matching the established standard instead of blank.

export const DEFAULT_TERMS_AND_CONDITIONS = `1. Booking & Payment
A minimum 30% advance payment is required at the time of booking to confirm your package. The balance payment must be completed before departure. Bookings are subject to availability at the time of confirmation.

2. Cancellations & Refunds
- More than 21 days before departure: Standard cancellation fee applies.
- 20-10 days before departure: 50% of total package cost will be charged.
- Less than 10 days before departure: 100% of package cost is non-refundable.
No refund for unused services or no-shows.

3. Itinerary & Sightseeing
The company reserves the right to change or reschedule the itinerary due to circumstances beyond control such as weather, traffic, strikes, political unrest, or force majeure. Alternative sightseeing will be arranged wherever possible without compromising quality.

4. Inclusions & Exclusions
The package includes services specifically mentioned in the itinerary (hotel stay, meals, transfers, tours, entry tickets as listed). Exclusions: personal expenses (laundry, minibar, phone calls, porterage, tips), optional tours, meals not mentioned, private transfers, driver tips, RT-PCR tests (if required).

5. Travel Insurance
Comprehensive travel insurance is mandatory for all guests and is not included in the package price. Guests must purchase insurance covering medical, accident, trip cancellation, baggage loss, and COVID-19 related expenses.

6. Travel Documents & Visa
Guests must carry valid passports (minimum 6 months validity), visas, and other required travel documents. The company is not responsible for denied boarding, visa rejection, or immigration delays due to incorrect documents.

7. Health & Safety
Guests are responsible for their own health during the trip. Any medical expenses, hospitalization, or treatment costs are to be borne by the traveler. Guests with pre-existing conditions must carry necessary medication and inform the company in advance.

8. Transportation & Delays
The company is not responsible for delays caused by airlines, traffic, roadblocks, or unforeseen issues. Additional costs for extra hotel nights, meals, or transfers due to delays will be borne by the guest.

9. Liability & Responsibility
Wanago acts only as a tour operator and uses third-party services (airlines, hotels, transport). We are not liable for loss, damage, accident, injury, or delay caused by these service providers. Guests are solely responsible for their personal belongings during the tour.

10. Force Majeure
In case of events such as natural disasters, strikes, political unrest, or government restrictions, the company reserves the right to amend or cancel services. Refunds or alternatives will be offered as per availability and supplier policies.`;

export const DEFAULT_INCLUSIONS: string[] = [
  "Accommodation as per itinerary",
  "Daily breakfast at hotel",
  "Airport transfers",
  "Transfers on Private/SIC basis (as per itinerary)",
  "Sightseeing tours as per itinerary",
  "Meet & greet assistance at arrival airport",
];

export const DEFAULT_EXCLUSIONS: string[] = [
  "Airfare (international & domestic)",
  "Visa charges",
  "Early check-in and late check-out",
  "Meals not mentioned in the itinerary",
  "Personal expenses (tips, shopping, laundry, etc.)",
  "Entrance fees for optional attractions",
  "Travel insurance",
  "Midnight surcharge for airport transfers (after 10:00 PM)",
  "Peak season surcharge (if applicable)",
];
