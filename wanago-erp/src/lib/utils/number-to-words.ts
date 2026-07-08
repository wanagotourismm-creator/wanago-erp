// Converts a rupee amount into words using the Indian numbering system
// (lakh/crore, not million/billion) — e.g. 5000 -> "Five Thousand Rupees
// Only", 125000 -> "One Lakh Twenty-Five Thousand Rupees Only". Used on
// the quotation/invoice PDF's "amount in words" line.

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigitsToWords(n: number): string {
  if (n < 20) return ONES[n];
  const tens = Math.floor(n / 10), ones = n % 10;
  return TENS[tens] + (ones ? `-${ONES[ones]}` : "");
}

function threeDigitsToWords(n: number): string {
  const hundreds = Math.floor(n / 100), rest = n % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest) parts.push(twoDigitsToWords(rest));
  return parts.join(" ");
}

export function numberToIndianWords(amount: number): string {
  const rupees = Math.floor(Math.abs(amount));
  if (rupees === 0) return "Zero Rupees Only";

  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = rupees % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigitsToWords(crore)} Crore`);
  if (lakh) parts.push(`${threeDigitsToWords(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigitsToWords(thousand)} Thousand`);
  if (hundred) parts.push(threeDigitsToWords(hundred));

  return `${parts.join(" ")} Rupees Only`;
}
