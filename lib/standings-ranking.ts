/**
 * Reglamento único de clasificación de Liga de Leyendas.
 *
 * El orden es SIEMPRE:
 * 1. Puntos (más es mejor)
 * 2. Partidos NO PRESENTADOS (menos es mejor)
 * 3. Enfrentamientos directos (puntos en una mini-clasificación entre los empatados)
 * 4. Diferencia de goles general
 * 5. Goles a favor generales
 *
 * El código del club se usa únicamente como último criterio técnico para que
 * el orden sea estable si absolutamente todo sigue empatado.
 */

export type RankingRow = {
  teamCode: string;
  points: number;
  noPresented?: number;
  goalDifference: number;
  goalsFor: number;
};

export type RankingMatch = {
  homeTeamCode: string;
  awayTeamCode: string;
  homeScore: number | null;
  awayScore: number | null;
  status?: string | null;
};

export type RankingPoints = {
  win: number;
  draw: number;
  loss: number;
};

function groupByNumber<T>(
  rows: T[],
  value: (row: T) => number,
  direction: "ASC" | "DESC"
): T[][] {
  const ordered = [...rows].sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    return direction === "DESC" ? bv - av : av - bv;
  });

  const groups: T[][] = [];
  for (const row of ordered) {
    const last = groups[groups.length - 1];
    if (!last || value(last[0]) !== value(row)) groups.push([row]);
    else last.push(row);
  }
  return groups;
}

function directPoints(
  teamCodes: Set<string>,
  matches: RankingMatch[],
  points: RankingPoints
) {
  const result = new Map<string, number>();
  for (const code of teamCodes) result.set(code, 0);

  for (const match of matches) {
    if (
      match.status &&
      String(match.status).toUpperCase() !== "PLAYED"
    ) {
      continue;
    }
    if (match.homeScore === null || match.awayScore === null) continue;
    if (
      !teamCodes.has(match.homeTeamCode) ||
      !teamCodes.has(match.awayTeamCode)
    ) {
      continue;
    }

    const home = result.get(match.homeTeamCode) ?? 0;
    const away = result.get(match.awayTeamCode) ?? 0;

    if (match.homeScore > match.awayScore) {
      result.set(match.homeTeamCode, home + points.win);
      result.set(match.awayTeamCode, away + points.loss);
    } else if (match.homeScore < match.awayScore) {
      result.set(match.homeTeamCode, home + points.loss);
      result.set(match.awayTeamCode, away + points.win);
    } else {
      result.set(match.homeTeamCode, home + points.draw);
      result.set(match.awayTeamCode, away + points.draw);
    }
  }

  return result;
}

/** Aplica el reglamento oficial completo a cualquier tabla. */
export function rankStandings<T extends RankingRow>(
  rows: T[],
  matches: RankingMatch[],
  points: RankingPoints
): T[] {
  const result: T[] = [];

  // 1. Puntos
  for (const pointsGroup of groupByNumber(rows, (row) => row.points, "DESC")) {
    // 2. Menos NO PRESENTADOS
    for (const npGroup of groupByNumber(
      pointsGroup,
      (row) => row.noPresented ?? 0,
      "ASC"
    )) {
      if (npGroup.length === 1) {
        result.push(npGroup[0]);
        continue;
      }

      // 3. Enfrentamientos directos: mini-clasificación por puntos
      const codes = new Set(npGroup.map((row) => row.teamCode));
      const h2h = directPoints(codes, matches, points);
      const h2hGroups = groupByNumber(
        npGroup,
        (row) => h2h.get(row.teamCode) ?? 0,
        "DESC"
      );

      for (const h2hGroup of h2hGroups) {
        // 4. DG general · 5. GF general · último fallback técnico estable
        h2hGroup.sort(
          (a, b) =>
            b.goalDifference - a.goalDifference ||
            b.goalsFor - a.goalsFor ||
            a.teamCode.localeCompare(b.teamCode, "es")
        );
        result.push(...h2hGroup);
      }
    }
  }

  return result;
}
