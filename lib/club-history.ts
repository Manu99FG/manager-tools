import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { buildStandings } from "@/lib/competitions";

type AnyRow = Record<string, unknown>;

export type ClubHistoryRecord = {
  value: string;
  detail?: string;
  season?: string;
  competition?: string;
  matchId?: string | null;
  playerId?: string | null;
  playerName?: string | null;
};

export type ClubHistoryData = {
  teamCode: string;
  palmares: {
    summary: {
      total: number;
      leagues: number;
      champions: number;
      cups: number;
    };
    groups: Array<{
      seriesId: string | null;
      seriesName: string;
      type: string;
      scope: string;
      count: number;
      titles: Array<{
        competitionId: string;
        competitionName: string;
        season: string;
      }>;
    }>;
  };
  overview: Array<{ label: string; record: ClubHistoryRecord | null }>;
  leaguePositions: {
    best: ClubHistoryRecord | null;
    worst: ClubHistoryRecord | null;
    seasons: Array<{
      season: string;
      competition: string;
      position: number;
      played: number;
      points: number;
    }>;
  };
  results: {
    biggestWin: ClubHistoryRecord | null;
    biggestLoss: ClubHistoryRecord | null;
    highestScoring: ClubHistoryRecord | null;
    highestScoringLeague: ClubHistoryRecord | null;
  };
  streaks: {
    wins: ClubHistoryRecord | null;
    losses: ClubHistoryRecord | null;
    unbeaten: ClubHistoryRecord | null;
    winless: ClubHistoryRecord | null;
    cleanSheets: ClubHistoryRecord | null;
    scoreless: ClubHistoryRecord | null;
  };
  players: {
    goalsSeason: ClubHistoryRecord | null;
    leagueGoalsSeason: ClubHistoryRecord | null;
    goalsMatch: ClubHistoryRecord | null;
    leagueGoalsMatch: ClubHistoryRecord | null;
    assistsSeason: ClubHistoryRecord | null;
    cleanSheetsSeason: ClubHistoryRecord | null;
    momSeason: ClubHistoryRecord | null;
    disciplineSeason: ClubHistoryRecord | null;
    youngestPlayed: ClubHistoryRecord | null;
    oldestPlayed: ClubHistoryRecord | null;
    youngestScorer: ClubHistoryRecord | null;
    oldestScorer: ClubHistoryRecord | null;
  };
  transfers: {
    biggestPaid: ClubHistoryRecord | null;
    biggestReceived: ClubHistoryRecord | null;
    totalSpent: ClubHistoryRecord | null;
    totalReceived: ClubHistoryRecord | null;
  };
  limitations: string[];
};

function num(row: AnyRow, keys: string[]): number {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (
      typeof value === "string" &&
      value.trim() &&
      Number.isFinite(Number(value))
    ) {
      return Number(value);
    }
  }
  return 0;
}

function nullableNum(row: AnyRow, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (
      typeof value === "string" &&
      value.trim() &&
      Number.isFinite(Number(value))
    ) {
      return Number(value);
    }
  }
  return null;
}

function str(row: AnyRow, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function getSeasonName(competition: AnyRow): string {
  const season = competition.season;

  if (season && typeof season === "object" && !Array.isArray(season)) {
    const name = (season as AnyRow).name;
    if (typeof name === "string") return name;
  }

  if (Array.isArray(season) && season[0] && typeof season[0] === "object") {
    const name = (season[0] as AnyRow).name;
    if (typeof name === "string") return name;
  }

  return "Temporada";
}

function played(match: AnyRow) {
  return (
    str(match, ["status"]) === "PLAYED" &&
    match.home_score !== null &&
    match.away_score !== null
  );
}

function matchMeta(match: AnyRow, teamCode: string) {
  const home = str(match, ["home_team_code"]) ?? "";
  const away = str(match, ["away_team_code"]) ?? "";
  const hs = num(match, ["home_score"]);
  const as = num(match, ["away_score"]);

  return {
    rival: home === teamCode ? away : home,
    own: home === teamCode ? hs : as,
    opp: home === teamCode ? as : hs,
  };
}

function money(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export async function getClubCodes(): Promise<string[]> {
  const supabase = getSupabaseAdmin();

  // Los clubes existen de forma independiente a su participación en una competición.
  // club_metadata actúa como registro base de clubes; competition_teams añade cualquier
  // código legado/externo que todavía no tenga metadatos creados.
  const [metadataResult, participantsResult] = await Promise.all([
    supabase.from("club_metadata").select("team_code"),
    supabase.from("competition_teams").select("team_code"),
  ]);

  if (metadataResult.error) throw metadataResult.error;
  if (participantsResult.error) throw participantsResult.error;

  return Array.from(
    new Set(
      [
        ...(metadataResult.data ?? []),
        ...(participantsResult.data ?? []),
      ]
        .map((row) => String(row.team_code ?? "").trim().toUpperCase())
        .filter(Boolean)
    )
  ).sort();
}

export async function getClubHistory(
  teamCodeInput: string
): Promise<ClubHistoryData> {
  const teamCode = teamCodeInput.toUpperCase();
  const supabase = getSupabaseAdmin();

  const [
    competitionsR,
    participantsR,
    roundsR,
    matchesR,
    statsR,
    transfersR,
    seasonsR,
    seriesR,
  ] = await Promise.all([
    supabase.from("competitions").select("*, season:seasons(*)"),
    supabase
      .from("competition_teams")
      .select("*")
      .eq("team_code", teamCode),
    supabase.from("competition_rounds").select("*"),
    supabase
      .from("matches")
      .select("*")
      .or(
        `home_team_code.eq.${teamCode},away_team_code.eq.${teamCode}`
      ),
    supabase
      .from("match_player_stats")
      .select("*")
      .eq("team_code", teamCode),
    supabase
      .from("transfers")
      .select("*")
      .or(
        `from_team_code.eq.${teamCode},to_team_code.eq.${teamCode}`
      ),
    supabase.from("seasons").select("*"),
    supabase.from("competition_series").select("*"),
  ]);

  for (const result of [
    competitionsR,
    participantsR,
    roundsR,
    matchesR,
    statsR,
    transfersR,
    seasonsR,
    seriesR,
  ]) {
    if (result.error) throw result.error;
  }

  const competitions = (competitionsR.data ?? []) as AnyRow[];
  const competitionById = new Map(
    competitions.map((competition) => [
      String(competition.id),
      competition,
    ])
  );

  const participantIds = new Set(
    (participantsR.data ?? []).map((row) =>
      String(row.competition_id)
    )
  );

  const rounds = (roundsR.data ?? []) as AnyRow[];
  const roundById = new Map(
    rounds.map((round) => [String(round.id), round])
  );

  const teamMatches = ((matchesR.data ?? []) as AnyRow[]).filter(
    played
  );
  const stats = (statsR.data ?? []) as AnyRow[];
  const transfers = (transfersR.data ?? []) as AnyRow[];
  const seasons = (seasonsR.data ?? []) as AnyRow[];
  const seriesRows = (seriesR.data ?? []) as AnyRow[];

  const seriesById = new Map(
    seriesRows.map((series) => [String(series.id), series])
  );

  const seasonNameById = new Map(
    seasons.map((season) => [
      String(season.id),
      str(season, ["name"]) ?? "Temporada",
    ])
  );

  const limitations: string[] = [];

  // =========================================================
  // POSICIÓN EN LIGA
  // =========================================================

  const leagueSeasons: ClubHistoryData["leaguePositions"]["seasons"] =
    [];

  const leagueStandingByCompetition = new Map<
    string,
    ReturnType<typeof buildStandings>
  >();

  for (const competition of competitions) {
    const id = String(competition.id);

    if (
      !participantIds.has(id) ||
      str(competition, ["type"]) !== "LEAGUE"
    ) {
      continue;
    }

    const [teamsResult, competitionMatchesResult] =
      await Promise.all([
        supabase
          .from("competition_teams")
          .select("*")
          .eq("competition_id", id),
        supabase
          .from("matches")
          .select("*")
          .eq("competition_id", id),
      ]);

    if (teamsResult.error) throw teamsResult.error;
    if (competitionMatchesResult.error) {
      throw competitionMatchesResult.error;
    }

    const fullStandings = buildStandings(
      competition as never,
      (teamsResult.data ?? []) as never,
      (competitionMatchesResult.data ?? []) as never
    );

    leagueStandingByCompetition.set(id, fullStandings);

    const standing = fullStandings.find(
      (row) => row.teamCode === teamCode
    );

    if (!standing || standing.played === 0) continue;

    leagueSeasons.push({
      season: getSeasonName(competition),
      competition: str(competition, ["name"]) ?? "Liga",
      position: standing.position,
      played: standing.played,
      points: standing.points,
    });
  }

  const bestRow = [...leagueSeasons].sort(
    (a, b) =>
      a.position - b.position ||
      b.points - a.points
  )[0];

  const worstRow = [...leagueSeasons].sort(
    (a, b) =>
      b.position - a.position ||
      a.points - b.points
  )[0];

  const bestPosition: ClubHistoryRecord | null = bestRow
    ? {
        value: `${bestRow.position}º`,
        season: bestRow.season,
        competition: bestRow.competition,
        detail: `${bestRow.points} pts · ${bestRow.played} PJ`,
      }
    : null;

  const worstPosition: ClubHistoryRecord | null = worstRow
    ? {
        value: `${worstRow.position}º`,
        season: worstRow.season,
        competition: worstRow.competition,
        detail: `${worstRow.points} pts · ${worstRow.played} PJ`,
      }
    : null;

  // =========================================================
  // PALMARÉS
  // =========================================================

  type TitleEdition = {
    competitionId: string;
    competitionName: string;
    season: string;
    seriesId: string | null;
    seriesName: string;
    type: string;
    scope: string;
    countsAsLeague: boolean;
    countsAsChampions: boolean;
  };

  const titleEditions: TitleEdition[] = [];

  for (const competition of competitions) {
    const competitionId = String(competition.id);
    if (!participantIds.has(competitionId)) continue;
    if (str(competition, ["status"]) !== "FINISHED") continue;

    const type = str(competition, ["type"]) ?? "OTHER";
    let champion: string | null = null;

    if (type === "LEAGUE") {
      const standings =
        leagueStandingByCompetition.get(competitionId) ?? [];
      champion = standings[0]?.teamCode ?? null;
    } else {
      const finalRoundIds = new Set(
        rounds
          .filter(
            (round) =>
              String(round.competition_id) === competitionId &&
              str(round, ["stage"]) === "FINAL"
          )
          .map((round) => String(round.id))
      );

      const finalMatches = teamMatches
        .filter(
          (match) =>
            String(match.competition_id) === competitionId &&
            finalRoundIds.has(String(match.round_id))
        )
        .sort((a, b) => {
          const roundA = roundById.get(String(a.round_id));
          const roundB = roundById.get(String(b.round_id));
          const byRound =
            num(roundA ?? {}, ["number"]) -
            num(roundB ?? {}, ["number"]);
          if (byRound !== 0) return byRound;

          return String(a.created_at ?? "").localeCompare(
            String(b.created_at ?? "")
          );
        });

      const final = finalMatches.at(-1);

      if (final) {
        const meta = matchMeta(final, teamCode);

        if (meta.own !== meta.opp) {
          champion = meta.own > meta.opp ? teamCode : meta.rival;
        }
      }
    }

    if (champion !== teamCode) continue;

    const seriesId = str(competition, ["series_id"]);
    const series = seriesId ? seriesById.get(seriesId) : undefined;

    titleEditions.push({
      competitionId,
      competitionName:
        str(competition, ["name"]) ?? "Competición",
      season: getSeasonName(competition),
      seriesId,
      seriesName:
        (series ? str(series, ["name"]) : null) ??
        str(competition, ["name"]) ??
        "Competición",
      type:
        (series ? str(series, ["type"]) : null) ??
        type,
      scope:
        (series ? str(series, ["scope"]) : null) ??
        "OTHER",
      countsAsLeague:
        Boolean(series?.counts_as_league) ||
        type === "LEAGUE",
      countsAsChampions:
        Boolean(series?.counts_as_champions),
    });
  }

  titleEditions.sort((a, b) =>
    a.season.localeCompare(b.season, "es", {
      numeric: true,
      sensitivity: "base",
    })
  );

  const palmaresGroupMap = new Map<
    string,
    ClubHistoryData["palmares"]["groups"][number]
  >();

  for (const title of titleEditions) {
    const key =
      title.seriesId ??
      `fallback:${title.type}:${title.seriesName}`;

    const currentGroup = palmaresGroupMap.get(key) ?? {
      seriesId: title.seriesId,
      seriesName: title.seriesName,
      type: title.type,
      scope: title.scope,
      count: 0,
      titles: [],
    };

    currentGroup.count += 1;
    currentGroup.titles.push({
      competitionId: title.competitionId,
      competitionName: title.competitionName,
      season: title.season,
    });

    palmaresGroupMap.set(key, currentGroup);
  }

  const palmaresGroups = [...palmaresGroupMap.values()].sort(
    (a, b) =>
      b.count - a.count ||
      a.seriesName.localeCompare(b.seriesName, "es", {
        sensitivity: "base",
      })
  );

  const palmaresSummary = {
    total: titleEditions.length,
    leagues: titleEditions.filter(
      (title) => title.countsAsLeague
    ).length,
    champions: titleEditions.filter(
      (title) => title.countsAsChampions
    ).length,
    cups: titleEditions.filter(
      (title) => title.scope === "DOMESTIC_CUP"
    ).length,
  };

  // =========================================================
  // RESULTADOS
  // =========================================================

  let biggestWin: ClubHistoryRecord | null = null;
  let biggestLoss: ClubHistoryRecord | null = null;
  let highestScoring: ClubHistoryRecord | null = null;
  let highestScoringLeague: ClubHistoryRecord | null = null;

  let bestWinDiff = -1;
  let worstLossDiff = -1;
  let highTotal = -1;
  let highLeagueTotal = -1;

  for (const match of teamMatches) {
    const competition = competitionById.get(
      String(match.competition_id)
    );
    if (!competition) continue;

    const meta = matchMeta(match, teamCode);
    const base = {
      season: getSeasonName(competition),
      competition:
        str(competition, ["name"]) ?? "Competición",
      matchId: str(match, ["id"]),
      detail: `vs ${meta.rival}`,
    };

    const diff = meta.own - meta.opp;

    if (diff > 0 && diff > bestWinDiff) {
      bestWinDiff = diff;
      biggestWin = {
        ...base,
        value: `${meta.own}-${meta.opp}`,
      };
    }

    if (diff < 0 && Math.abs(diff) > worstLossDiff) {
      worstLossDiff = Math.abs(diff);
      biggestLoss = {
        ...base,
        value: `${meta.own}-${meta.opp}`,
      };
    }

    const total = meta.own + meta.opp;

    if (total > highTotal) {
      highTotal = total;
      highestScoring = {
        ...base,
        value: `${meta.own}-${meta.opp}`,
      };
    }

    if (
      str(competition, ["type"]) === "LEAGUE" &&
      total > highLeagueTotal
    ) {
      highLeagueTotal = total;
      highestScoringLeague = {
        ...base,
        value: `${meta.own}-${meta.opp}`,
      };
    }
  }

  // =========================================================
  // RACHAS
  // =========================================================

  type StreakKey =
    | "wins"
    | "losses"
    | "unbeaten"
    | "winless"
    | "cleanSheets"
    | "scoreless";

  const current: Record<StreakKey, number> = {
    wins: 0,
    losses: 0,
    unbeaten: 0,
    winless: 0,
    cleanSheets: 0,
    scoreless: 0,
  };

  const streaks: Record<
    StreakKey,
    ClubHistoryRecord | null
  > = {
    wins: null,
    losses: null,
    unbeaten: null,
    winless: null,
    cleanSheets: null,
    scoreless: null,
  };

  const sortedMatches = [...teamMatches].sort((a, b) => {
    const competitionA = competitionById.get(
      String(a.competition_id)
    );
    const competitionB = competitionById.get(
      String(b.competition_id)
    );

    const seasonA = String(competitionA?.season_id ?? "");
    const seasonB = String(competitionB?.season_id ?? "");

    if (seasonA !== seasonB) {
      return seasonA.localeCompare(seasonB);
    }

    const roundA = roundById.get(String(a.round_id));
    const roundB = roundById.get(String(b.round_id));

    const roundDifference =
      num(roundA ?? {}, ["number"]) -
      num(roundB ?? {}, ["number"]);

    if (roundDifference !== 0) {
      return roundDifference;
    }

    return String(a.created_at ?? "").localeCompare(
      String(b.created_at ?? "")
    );
  });

  function updateStreak(
    key: StreakKey,
    condition: boolean,
    match: AnyRow
  ) {
    current[key] = condition ? current[key] + 1 : 0;

    const previous = streaks[key]
      ? Number(
          streaks[key]!.value.match(/\d+/)?.[0] ?? 0
        )
      : 0;

    if (current[key] <= previous) return;

    const competition = competitionById.get(
      String(match.competition_id)
    );

    streaks[key] = {
      value: `${current[key]} partidos`,
      season: competition
        ? getSeasonName(competition)
        : undefined,
      competition: competition
        ? str(competition, ["name"]) ?? undefined
        : undefined,
      matchId: str(match, ["id"]),
      detail: "Récord alcanzado en este partido",
    };
  }

  for (const match of sortedMatches) {
    const meta = matchMeta(match, teamCode);

    updateStreak("wins", meta.own > meta.opp, match);
    updateStreak("losses", meta.own < meta.opp, match);
    updateStreak("unbeaten", meta.own >= meta.opp, match);
    updateStreak("winless", meta.own <= meta.opp, match);
    updateStreak("cleanSheets", meta.opp === 0, match);
    updateStreak("scoreless", meta.own === 0, match);
  }

  // =========================================================
  // JUGADORES
  // =========================================================

  type Aggregate = {
    playerId: string | null;
    name: string;
    goals: number;
    assists: number;
    mom: number;
    dp: number;
    cleanSheets: number;
  };

  const bySeason = new Map<string, Aggregate>();
  const byLeagueSeason = new Map<string, Aggregate>();

  const matchById = new Map(
    teamMatches.map((match) => [String(match.id), match])
  );

  let goalsMatch: ClubHistoryRecord | null = null;
  let leagueGoalsMatch: ClubHistoryRecord | null = null;

  let maxGoalsMatch = -1;
  let maxLeagueGoalsMatch = -1;

  let youngestPlayed: ClubHistoryRecord | null = null;
  let oldestPlayed: ClubHistoryRecord | null = null;
  let youngestScorer: ClubHistoryRecord | null = null;
  let oldestScorer: ClubHistoryRecord | null = null;

  let youngestPlayedAge = Number.POSITIVE_INFINITY;
  let oldestPlayedAge = Number.NEGATIVE_INFINITY;
  let youngestScorerAge = Number.POSITIVE_INFINITY;
  let oldestScorerAge = Number.NEGATIVE_INFINITY;

  let rowsWithFrozenAge = 0;
  let rowsWithFrozenPosition = 0;

  for (const row of stats) {
    const match = matchById.get(String(row.match_id));
    if (!match) continue;

    const competition = competitionById.get(
      String(match.competition_id)
    );
    if (!competition) continue;

    const seasonKey = String(
      competition.season_id ?? getSeasonName(competition)
    );

    const playerId = str(row, ["player_id"]);
    const name =
      str(row, ["esms_name", "player_name"]) ??
      "Jugador";

    const identity =
      playerId ?? `${teamCode}:${name}`;

    const goals = num(row, ["gls", "goals"]);
    const assists = num(row, ["ass", "assists"]);
    const mom = num(row, ["mom"]);
    const dp = num(row, ["dp"]);
    const minutes = num(row, ["min", "minutes"]);

    const age = nullableNum(row, ["age_at_match"]);
    const position = str(row, ["position_at_match"]);

    if (age !== null) rowsWithFrozenAge++;
    if (position) rowsWithFrozenPosition++;

    const teamResult = matchMeta(match, teamCode);

    const cleanSheet =
      position === "GK" &&
      minutes > 0 &&
      teamResult.opp === 0
        ? 1
        : 0;

    const key = `${seasonKey}|${identity}`;

    const aggregate = bySeason.get(key) ?? {
      playerId,
      name,
      goals: 0,
      assists: 0,
      mom: 0,
      dp: 0,
      cleanSheets: 0,
    };

    aggregate.goals += goals;
    aggregate.assists += assists;
    aggregate.mom += mom;
    aggregate.dp += dp;
    aggregate.cleanSheets += cleanSheet;

    bySeason.set(key, aggregate);

    if (str(competition, ["type"]) === "LEAGUE") {
      const leagueAggregate =
        byLeagueSeason.get(key) ?? {
          playerId,
          name,
          goals: 0,
          assists: 0,
          mom: 0,
          dp: 0,
          cleanSheets: 0,
        };

      leagueAggregate.goals += goals;
      leagueAggregate.assists += assists;
      leagueAggregate.mom += mom;
      leagueAggregate.dp += dp;
      leagueAggregate.cleanSheets += cleanSheet;

      byLeagueSeason.set(key, leagueAggregate);
    }

    const base = {
      playerId,
      playerName: name,
      season: getSeasonName(competition),
      competition:
        str(competition, ["name"]) ?? "Competición",
      matchId: str(match, ["id"]),
    };

    if (goals > maxGoalsMatch) {
      maxGoalsMatch = goals;
      goalsMatch = {
        ...base,
        value: `${goals} goles`,
      };
    }

    if (
      str(competition, ["type"]) === "LEAGUE" &&
      goals > maxLeagueGoalsMatch
    ) {
      maxLeagueGoalsMatch = goals;
      leagueGoalsMatch = {
        ...base,
        value: `${goals} goles`,
      };
    }

    if (age !== null && minutes > 0) {
      if (age < youngestPlayedAge) {
        youngestPlayedAge = age;
        youngestPlayed = {
          ...base,
          value: `${age} años`,
        };
      }

      if (age > oldestPlayedAge) {
        oldestPlayedAge = age;
        oldestPlayed = {
          ...base,
          value: `${age} años`,
        };
      }
    }

    if (age !== null && goals > 0) {
      if (age < youngestScorerAge) {
        youngestScorerAge = age;
        youngestScorer = {
          ...base,
          value: `${age} años`,
          detail: `${goals} gol${goals === 1 ? "" : "es"} en el partido`,
        };
      }

      if (age > oldestScorerAge) {
        oldestScorerAge = age;
        oldestScorer = {
          ...base,
          value: `${age} años`,
          detail: `${goals} gol${goals === 1 ? "" : "es"} en el partido`,
        };
      }
    }
  }

  function bestAggregate(
    map: Map<string, Aggregate>,
    field:
      | "goals"
      | "assists"
      | "mom"
      | "dp"
      | "cleanSheets",
    suffix: string
  ): ClubHistoryRecord | null {
    let winner: Aggregate | null = null;
    let max = -1;
    let winnerSeasonKey = "";

    for (const [key, row] of map) {
      if (row[field] > max) {
        max = row[field];
        winner = row;
        winnerSeasonKey = key.split("|")[0];
      }
    }

    if (!winner || max <= 0) return null;

    const competition = competitions.find(
      (item) =>
        String(
          item.season_id ?? getSeasonName(item)
        ) === winnerSeasonKey
    );

    return {
      value: `${winner[field]} ${suffix}`,
      playerId: winner.playerId,
      playerName: winner.name,
      season: competition
        ? getSeasonName(competition)
        : seasonNameById.get(winnerSeasonKey) ??
          "Temporada",
    };
  }

  const goalsSeason = bestAggregate(
    bySeason,
    "goals",
    "goles"
  );

  const leagueGoalsSeason = bestAggregate(
    byLeagueSeason,
    "goals",
    "goles"
  );

  const assistsSeason = bestAggregate(
    bySeason,
    "assists",
    "asistencias"
  );

  const momSeason = bestAggregate(
    bySeason,
    "mom",
    "MVP"
  );

  const disciplineSeason = bestAggregate(
    bySeason,
    "dp",
    "DP"
  );

  const cleanSheetsSeason = bestAggregate(
    bySeason,
    "cleanSheets",
    "porterías a cero"
  );

  if (stats.length > 0 && rowsWithFrozenAge < stats.length) {
    limitations.push(
      "Los récords de edad solo incluyen partidos que ya tienen age_at_match. Los .stt importados después de instalar V20.1 quedan registrados automáticamente."
    );
  }

  if (
    stats.length > 0 &&
    rowsWithFrozenPosition < stats.length
  ) {
    limitations.push(
      "Las porterías a cero individuales solo incluyen partidos que ya tienen position_at_match. Los nuevos .stt quedan preparados automáticamente."
    );
  }

  // =========================================================
  // FICHAJES
  // =========================================================

  const paidRows = transfers.filter(
    (row) =>
      str(row, ["to_team_code"]) === teamCode &&
      !["LOAN", "LOAN_RETURN", "PENDING"].includes(
        str(row, ["movement_type"]) ?? "TRANSFER"
      )
  );

  const receivedRows = transfers.filter(
    (row) =>
      str(row, ["from_team_code"]) === teamCode &&
      !["LOAN", "LOAN_RETURN", "PENDING"].includes(
        str(row, ["movement_type"]) ?? "TRANSFER"
      )
  );

  const paidWithFee = paidRows.filter(
    (row) => nullableNum(row, ["fee"]) !== null
  );

  const receivedWithFee = receivedRows.filter(
    (row) => nullableNum(row, ["fee"]) !== null
  );

  const biggestPaidRow = [...paidWithFee].sort(
    (a, b) =>
      (nullableNum(b, ["fee"]) ?? 0) -
      (nullableNum(a, ["fee"]) ?? 0)
  )[0];

  const biggestReceivedRow = [
    ...receivedWithFee,
  ].sort(
    (a, b) =>
      (nullableNum(b, ["fee"]) ?? 0) -
      (nullableNum(a, ["fee"]) ?? 0)
  )[0];

  function transferSeasonName(row: AnyRow) {
    const seasonId = str(row, ["season_id"]);
    return seasonId
      ? seasonNameById.get(seasonId) ?? "Temporada"
      : undefined;
  }

  const biggestPaid: ClubHistoryRecord | null =
    biggestPaidRow
      ? {
          value: money(
            nullableNum(biggestPaidRow, ["fee"]) ?? 0
          ),
          playerId: str(biggestPaidRow, ["player_id"]),
          season: transferSeasonName(biggestPaidRow),
          detail: `desde ${
            str(biggestPaidRow, ["from_team_code"]) ??
            "otro club"
          }`,
        }
      : null;

  const biggestReceived: ClubHistoryRecord | null =
    biggestReceivedRow
      ? {
          value: money(
            nullableNum(biggestReceivedRow, ["fee"]) ?? 0
          ),
          playerId: str(
            biggestReceivedRow,
            ["player_id"]
          ),
          season: transferSeasonName(
            biggestReceivedRow
          ),
          detail: `a ${
            str(biggestReceivedRow, ["to_team_code"]) ??
            "otro club"
          }`,
        }
      : null;

  function bestSeasonTotal(
    rows: AnyRow[],
    label: string
  ): ClubHistoryRecord | null {
    const totals = new Map<string, number>();

    for (const row of rows) {
      const seasonId = str(row, ["season_id"]);
      const fee = nullableNum(row, ["fee"]);

      if (!seasonId || fee === null) continue;

      totals.set(
        seasonId,
        (totals.get(seasonId) ?? 0) + fee
      );
    }

    let bestSeasonId: string | null = null;
    let bestValue = -1;

    for (const [seasonId, value] of totals) {
      if (value > bestValue) {
        bestSeasonId = seasonId;
        bestValue = value;
      }
    }

    if (!bestSeasonId || bestValue < 0) return null;

    return {
      value: money(bestValue),
      season:
        seasonNameById.get(bestSeasonId) ??
        "Temporada",
      detail: label,
    };
  }

  const totalSpent = bestSeasonTotal(
    paidRows,
    "Mayor gasto total en fichajes de una temporada"
  );

  const totalReceived = bestSeasonTotal(
    receivedRows,
    "Mayor ingreso total por traspasos de una temporada"
  );

  if (
    transfers.length > 0 &&
    transfers.some(
      (row) =>
        nullableNum(row, ["fee"]) === null ||
        !str(row, ["season_id"])
    )
  ) {
    limitations.push(
      "Hay traspasos antiguos sin importe o temporada. Puedes completarlos desde /admin/fichajes; los récords económicos solo usan movimientos configurados."
    );
  }

  return {
    teamCode,

    palmares: {
      summary: palmaresSummary,
      groups: palmaresGroups,
    },

    overview: [
      {
        label: "Mejor posición en liga",
        record: bestPosition,
      },
      {
        label: "Mayor victoria",
        record: biggestWin,
      },
      {
        label: "Mayor racha de victorias",
        record: streaks.wins,
      },
      {
        label: "Récord goleador de temporada",
        record: goalsSeason,
      },
      {
        label: "Más asistencias en una temporada",
        record: assistsSeason,
      },
      {
        label: "Fichaje más caro",
        record: biggestPaid,
      },
    ],

    leaguePositions: {
      best: bestPosition,
      worst: worstPosition,
      seasons: leagueSeasons,
    },

    results: {
      biggestWin,
      biggestLoss,
      highestScoring,
      highestScoringLeague,
    },

    streaks,

    players: {
      goalsSeason,
      leagueGoalsSeason,
      goalsMatch,
      leagueGoalsMatch,
      assistsSeason,
      cleanSheetsSeason,
      momSeason,
      disciplineSeason,
      youngestPlayed,
      oldestPlayed,
      youngestScorer,
      oldestScorer,
    },

    transfers: {
      biggestPaid,
      biggestReceived,
      totalSpent,
      totalReceived,
    },

    limitations,
  };
}
