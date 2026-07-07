import { Phone } from "lucide-react";
import { cn } from "@/lib/utils/helpers";

type Props = {
  phone:      string | null | undefined;
  iconSize?:  number;
  className?: string;
  // "text" (default) renders icon + number inline, replacing the plain-text
  // phone displays used across list rows/detail modals. "button" renders a
  // standalone round icon button, for compact contexts like a swipe-reveal
  // action or a card header (matches the pattern already used in
  // ProfileHeroCard.tsx).
  variant?: "text" | "button";
};

// Turns a plain-text phone number into a real tel: link, so tapping it on a
// phone opens the dialer directly instead of requiring a copy/paste.
export function PhoneLink({ phone, iconSize = 12, className, variant = "text" }: Props) {
  if (!phone) return null;

  if (variant === "button") {
    return (
      <a
        href={`tel:${phone}`}
        title="Call"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "flex items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20",
          className
        )}
      >
        <Phone size={iconSize} />
      </a>
    );
  }

  return (
    <a
      href={`tel:${phone}`}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex items-center gap-1.5 text-inherit transition-colors hover:text-primary hover:underline",
        className
      )}
    >
      <Phone size={iconSize} className="flex-shrink-0" />
      {phone}
    </a>
  );
}
