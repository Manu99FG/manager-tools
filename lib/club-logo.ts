export function getClubLogo(code: string): string {
  const normalizedCode = code.toUpperCase();

  return `/clubs/${normalizedCode}.png`;
}