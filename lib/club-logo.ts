import { CLUB_NAMES } from "@/lib/club-names";

export function getClubLogo(code: string): string {
  const normalizedCode = code.toUpperCase();

  return CLUB_NAMES[normalizedCode] ? `/clubs/${normalizedCode}.png` : "/clubs/_placeholder.svg";
}
