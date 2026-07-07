import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import type { Timestamp } from "@/types/global";
import { REF_FORMATS } from "@/lib/constants";

// ── Tailwind class merge ──────────────────────────────────────
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ── Date helpers ──────────────────────────────────────────────
export function toDate(value: Timestamp | Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);
  if ("seconds" in value) return new Date(value.seconds * 1000);
  return null;
}

export function formatDate(
  value: Timestamp | Date | string | null | undefined,
  fmt = "dd MMM yyyy"
): string {
  const d = toDate(value);
  if (!d) return "—";
  return format(d, fmt);
}

export function formatDateTime(
  value: Timestamp | Date | string | null | undefined
): string {
  return formatDate(value, "dd MMM yyyy, hh:mm a");
}

export function timeAgo(value: Timestamp | Date | string | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}

// ── Currency ──────────────────────────────────────────────────
export function formatCurrency(
  amount: number | null | undefined,
  currency = "INR"
): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style:    "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Reference number generator ───────────────────────────────
export function generateRefNumber(
  prefix: keyof typeof REF_FORMATS,
  existingIds: string[] = []
): string {
  const pfx = REF_FORMATS[prefix];
  const nums = existingIds
    .map((id) => {
      const m = id.match(new RegExp(`^${pfx}-(\\d+)$`));
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter(Boolean);
  const next = nums.length ? Math.max(...nums) + 1 : 1001;
  return `${pfx}-${next}`;
}

// ── String helpers ────────────────────────────────────────────
export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function truncate(str: string, max = 40): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + "…";
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ── Phone / WhatsApp helpers ─────────────────────────────────
// wa.me links need the full international number (country code + number,
// digits only, no leading +). Numbers in this app are stored as plain
// 10-digit local numbers, so this only prepends India's country code when
// the cleaned number looks like one — anything else (already has a
// country code, or an unexpected format) passes through unchanged rather
// than guessing wrong.
export function buildWhatsAppLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountryCode = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCountryCode}`;
}

// ── Number helpers ────────────────────────────────────────────
export function compactNumber(n: number): string {
  if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000)    return `${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000)       return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Object helpers ────────────────────────────────────────────
export function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}
