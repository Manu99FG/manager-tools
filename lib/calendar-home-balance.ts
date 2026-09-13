export type CalendarFixture = [string, string];
export type CalendarRound = CalendarFixture[];

const BYE = "__BYE__";

/**
 * Round-robin equilibrado (una vuelta).
 *
 * La orientación Berger utilizada aquí deja, con 8 equipos, exactamente
 * 3 o 4 partidos de local por club. También evita sesgos extremos de
 * localía en ligas con más participantes.
 */
export function createBalancedSingleRoundRobin(inputTeams: string[]): CalendarRound[] {
  const teams = [...inputTeams];
  if (teams.length % 2 === 1) teams.push(BYE);

  const total = teams.length;
  const rounds: CalendarRound[] = [];
  let rotation = [...teams];

  for (let roundIndex = 0; roundIndex < total - 1; roundIndex += 1) {
    const fixtures: CalendarRound = [];

    for (let index = 0; index < total / 2; index += 1) {
      let home = rotation[index];
      let away = rotation[total - 1 - index];

      // Orientación Berger equilibrada. El primer cruce alterna y el resto
      // alterna por índice para repartir localías de forma homogénea.
      const shouldSwap =
        (index % 2 === 1) !== (index === 0 && roundIndex % 2 === 1);

      if (shouldSwap) [home, away] = [away, home];

      if (home !== BYE && away !== BYE) fixtures.push([home, away]);
    }

    rounds.push(fixtures);
    rotation = [rotation[0], rotation[total - 1], ...rotation.slice(1, total - 1)];
  }

  return rounds;
}

/**
 * Calendario de liga a ida y vuelta.
 *
 * La segunda vuelta invierte local/visitante y recorre las jornadas de la
 * primera vuelta en orden inverso. Esta combinación garantiza que, para
 * ligas pares estándar (p. ej. 16 clubes / 30 jornadas), ningún club tenga
 * más de 2 jornadas consecutivas como local.
 */
export function createBalancedLeagueCalendar(
  inputTeams: string[],
  homeAndAway: boolean
): CalendarRound[] {
  const firstLeg = createBalancedSingleRoundRobin(inputTeams);
  if (!homeAndAway) {
    assertMaxConsecutiveHome(firstLeg, 2);
    return firstLeg;
  }

  const secondLeg = [...firstLeg]
    .reverse()
    .map((round) => round.map(([home, away]) => [away, home] as CalendarFixture));

  const allRounds = [...firstLeg, ...secondLeg];
  assertMaxConsecutiveHome(allRounds, 2);
  return allRounds;
}

export function homeCounts(rounds: CalendarRound[]) {
  const counts = new Map<string, number>();
  for (const round of rounds) {
    for (const [home, away] of round) {
      counts.set(home, (counts.get(home) ?? 0) + 1);
      if (!counts.has(away)) counts.set(away, 0);
    }
  }
  return counts;
}

export function assertHomeCountRange(
  rounds: CalendarRound[],
  minHome: number,
  maxHome: number
) {
  const counts = homeCounts(rounds);
  const invalid = [...counts.entries()].filter(
    ([, count]) => count < minHome || count > maxHome
  );

  if (invalid.length) {
    throw new Error(
      `No se pudo equilibrar la localía (${minHome}-${maxHome}). Revisa: ${invalid
        .map(([team, count]) => `${team} (${count})`)
        .join(", ")}.`
    );
  }
}

export function assertMaxConsecutiveHome(
  rounds: CalendarRound[],
  maximum: number
) {
  const teams = new Set<string>();
  for (const round of rounds) {
    for (const [home, away] of round) {
      teams.add(home);
      teams.add(away);
    }
  }

  const streak = new Map<string, number>();
  const worst = new Map<string, number>();
  for (const team of teams) {
    streak.set(team, 0);
    worst.set(team, 0);
  }

  for (const round of rounds) {
    const homeTeams = new Set(round.map(([home]) => home));
    for (const team of teams) {
      const next = homeTeams.has(team) ? (streak.get(team) ?? 0) + 1 : 0;
      streak.set(team, next);
      worst.set(team, Math.max(worst.get(team) ?? 0, next));
    }
  }

  const invalid = [...worst.entries()].filter(([, value]) => value > maximum);
  if (invalid.length) {
    throw new Error(
      `El calendario supera ${maximum} jornadas seguidas como local: ${invalid
        .map(([team, value]) => `${team} (${value})`)
        .join(", ")}.`
    );
  }
}
