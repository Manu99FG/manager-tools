export const CLUB_CLASSES = [
  "Clase A",
  "Clase B",
  "Clase C",
  "Clase D",
  "Clase E",
  "Clase F",
  "Clase G",
  "Clase H",
] as const;

export type ClubClass = (typeof CLUB_CLASSES)[number];

export function normalizeClubClass(value: unknown): ClubClass | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ");

  const match = normalized.match(/^(?:CLASE\s*)?([A-H])$/);
  if (!match) return null;
  return `Clase ${match[1]}` as ClubClass;
}

export function validateClassDistribution(
  rows: Array<{ teamCode: string; clubClass: string | null | undefined }>,
  expectedPerClass = 4
) {
  const missing: string[] = [];
  const invalid: Array<{ teamCode: string; value: string }> = [];
  const byClass = new Map<ClubClass, string[]>(CLUB_CLASSES.map((clubClass) => [clubClass, []]));

  for (const row of rows) {
    const raw = typeof row.clubClass === "string" ? row.clubClass.trim() : "";
    if (!raw) {
      missing.push(row.teamCode);
      continue;
    }
    const normalized = normalizeClubClass(raw);
    if (!normalized) {
      invalid.push({ teamCode: row.teamCode, value: raw });
      continue;
    }
    byClass.get(normalized)!.push(row.teamCode);
  }

  const wrongSizes = CLUB_CLASSES
    .map((clubClass) => ({ clubClass, teams: byClass.get(clubClass) ?? [] }))
    .filter((item) => item.teams.length !== expectedPerClass);

  return { missing, invalid, byClass, wrongSizes };
}
