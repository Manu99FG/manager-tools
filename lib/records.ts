import { getSupabaseAdmin } from "@/lib/supabase-admin";

type Season = {
  id: string;
  name: string;
};

type Series = {
  id: string;
  name: string;
  type: string;
  scope: string;
  league_level: number | null;
  counts_as_league: boolean;
  counts_as_champions: boolean;
  tracks_promotions: boolean;
  promoted_places: number;
};

type Competition = {
  id: string;
  series_id: string | null;
  name: string;
  type: string;
  status: string;
  points_win: number;
  points_draw: number;
  points_loss: number;
  season: Season | null;
};

type Team = {
  competition_id: string;
  team_code: string;
};

type Round = {
  id: string;
  competition_id: string;
  number: number;
  name: string;
  stage: string | null;
};

type Match = {
  id: string;
  competition_id: string;
  round_id: string | null;
  home_team_code: string;
  away_team_code: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  created_at: string;
};

type Stat = {
  match_id: string;
  player_id: string | null;
  team_code: string;
  esms_name: string;
  minutes: number;
  goals: number;
  assists: number;
};

export type RecordHolder = {
  value: number;
  playerId?: string | null;
  playerName?: string;
  teamCode?: string;
  seasonName?: string;
  competitionName?: string;
  matchId?: string;
  opponentCode?: string;
  score?: string;
};

export type RecordItem = {
  key: string;
  title: string;
  unit?: string;
  holders: RecordHolder[];
  available: boolean;
  note?: string;
};

export type CompetitionRecordGroup = {
  series: Series;
  records: RecordItem[];
};

export type RecordsData = {
  global: RecordItem[];
  competitions: CompetitionRecordGroup[];
};

export async function getRecordsData(): Promise<RecordsData> {
  const supabase = getSupabaseAdmin();

  const [
    seriesRes,
    competitionsRes,
    teamsRes,
    roundsRes,
    matchesRes,
  ] = await Promise.all([
    supabase.from("competition_series").select("*").order("name"),
    supabase.from("competitions").select("*,season:seasons(id,name)").order("created_at"),
    supabase.from("competition_teams").select("competition_id,team_code"),
    supabase.from("competition_rounds").select("id,competition_id,number,name,stage").order("number"),
    supabase.from("matches").select("id,competition_id,round_id,home_team_code,away_team_code,home_score,away_score,status,created_at").order("created_at"),
  ]);

  if (seriesRes.error) throw seriesRes.error;
  if (competitionsRes.error) throw competitionsRes.error;
  if (teamsRes.error) throw teamsRes.error;
  if (roundsRes.error) throw roundsRes.error;
  if (matchesRes.error) throw matchesRes.error;

  const series = (seriesRes.data ?? []) as Series[];
  const competitions = (competitionsRes.data ?? []) as unknown as Competition[];
  const teams = (teamsRes.data ?? []) as Team[];
  const rounds = (roundsRes.data ?? []) as Round[];
  const matches = (matchesRes.data ?? []) as Match[];

  const played = matches.filter(isPlayed);
  const stats = await loadStats(played.map((m) => m.id));

  const editionData = competitions.map((competition) =>
    buildEdition(
      competition,
      series.find((s) => s.id === competition.series_id) ?? null,
      teams.filter((t) => t.competition_id === competition.id),
      rounds.filter((r) => r.competition_id === competition.id),
      matches.filter((m) => m.competition_id === competition.id),
      stats
    )
  );

  return {
    global: buildGlobalRecords(series, editionData, played, stats, rounds),
    competitions: series.map((s) => ({
      series: s,
      records: buildSeriesRecords(
        s,
        editionData.filter((edition) => edition.competition.series_id === s.id),
        played.filter((match) => {
          const c = competitions.find((item) => item.id === match.competition_id);
          return c?.series_id === s.id;
        }),
        stats,
        rounds
      ),
    })),
  };
}

export async function getCompetitionRecords(seriesId: string) {
  const data = await getRecordsData();
  return data.competitions.find((group) => group.series.id === seriesId) ?? null;
}

function isPlayed(match: Match) {
  return (
    match.status === "PLAYED" &&
    match.home_score !== null &&
    match.away_score !== null
  );
}

function buildEdition(
  competition: Competition,
  series: Series | null,
  teams: Team[],
  rounds: Round[],
  matches: Match[],
  allStats: Stat[]
) {
  const played = matches.filter(isPlayed);
  const table = new Map<string, {
    teamCode: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    gf: number;
    ga: number;
    points: number;
  }>();

  for (const team of teams) {
    table.set(team.team_code, {
      teamCode: team.team_code,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      points: 0,
    });
  }

  for (const match of played) {
    const home = table.get(match.home_team_code);
    const away = table.get(match.away_team_code);
    if (!home || !away) continue;

    const hs = match.home_score!;
    const as = match.away_score!;

    home.played++;
    away.played++;
    home.gf += hs;
    home.ga += as;
    away.gf += as;
    away.ga += hs;

    if (hs > as) {
      home.won++;
      away.lost++;
      home.points += competition.points_win;
      away.points += competition.points_loss;
    } else if (hs < as) {
      away.won++;
      home.lost++;
      away.points += competition.points_win;
      home.points += competition.points_loss;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += competition.points_draw;
      away.points += competition.points_draw;
    }
  }

  const standings = [...table.values()].sort(
    (a, b) =>
      b.points - a.points ||
      (b.gf - b.ga) - (a.gf - a.ga) ||
      b.gf - a.gf ||
      a.teamCode.localeCompare(b.teamCode)
  );

  const matchIds = new Set(matches.map((m) => m.id));
  const stats = allStats.filter((s) => matchIds.has(s.match_id));
  const playerSeason = aggregatePlayers(stats);

  const finalRoundIds = new Set(
    rounds.filter((r) => r.stage === "FINAL").map((r) => r.id)
  );
  const finals = played.filter(
    (m) => m.round_id && finalRoundIds.has(m.round_id)
  );

  return {
    competition,
    series,
    standings,
    played,
    playerSeason,
    finals,
  };
}

function buildGlobalRecords(
  series: Series[],
  editions: ReturnType<typeof buildEdition>[],
  played: Match[],
  stats: Stat[],
  rounds: Round[]
): RecordItem[] {
  const allPlayerSeasons = editions.flatMap((edition) =>
    edition.playerSeason.map((row) => ({
      ...row,
      seasonName: edition.competition.season?.name ?? "Temporada",
      competitionName: edition.competition.name,
    }))
  );

  const historicalPlayers = aggregatePlayers(stats);

  const finishedEditions = editions.filter(
    (edition) => edition.competition.status === "FINISHED"
  );

  const titleCounts = new Map<string, number>();
  const leagueCounts = new Map<string, number>();
  const championsCounts = new Map<string, number>();

  for (const edition of finishedEditions) {
    const champion = getChampion(edition);
    if (!champion) continue;

    add(titleCounts, champion, 1);

    if (edition.series?.counts_as_league) {
      add(leagueCounts, champion, 1);
    }

    if (edition.series?.counts_as_champions) {
      add(championsCounts, champion, 1);
    }
  }

  const streaks = calculateWinStreaks(played, editions);

  return [
    maxRecord("global-season-goals", "Más goles en una temporada", allPlayerSeasons, "goals", "goles"),
    maxRecord("global-season-assists", "Más asistencias en una temporada", allPlayerSeasons, "assists", "asistencias"),
    maxRecord("global-historical-goals", "Máximo goleador histórico", historicalPlayers, "goals", "goles"),
    maxRecord("global-historical-assists", "Máximo asistente histórico", historicalPlayers, "assists", "asistencias"),
    mapRecord("global-titles", "Más títulos", titleCounts, "títulos"),
    mapRecord("global-leagues", "Más ligas", leagueCounts, "ligas", series.some((s) => s.counts_as_league) ? undefined : "Marca qué competiciones cuentan como liga."),
    mapRecord("global-champions", "Más Champions", championsCounts, "Champions", series.some((s) => s.counts_as_champions) ? undefined : "Marca la competición que cuenta como Champions."),
    streakRecord(streaks),
  ];
}

function buildSeriesRecords(
  series: Series,
  editions: ReturnType<typeof buildEdition>[],
  played: Match[],
  stats: Stat[],
  rounds: Round[]
): RecordItem[] {
  const finished = editions.filter(
    (edition) => edition.competition.status === "FINISHED"
  );

  const titles = new Map<string, number>();
  const finals = new Map<string, number>();
  const promotions = new Map<string, number>();

  for (const edition of finished) {
    const champion = getChampion(edition);
    if (champion) add(titles, champion, 1);

    if (edition.finals.length > 0) {
      for (const final of edition.finals) {
        add(finals, final.home_team_code, 1);
        add(finals, final.away_team_code, 1);
      }
    }

    if (
      series.type === "LEAGUE" &&
      series.tracks_promotions &&
      series.promoted_places > 0
    ) {
      edition.standings
        .slice(0, series.promoted_places)
        .forEach((row) => add(promotions, row.teamCode, 1));
    }
  }

  const teamSeasons = editions.flatMap((edition) =>
    edition.standings.map((row) => ({
      ...row,
      seasonName: edition.competition.season?.name ?? "Temporada",
      competitionName: edition.competition.name,
    }))
  );

  const playerSeasons = editions.flatMap((edition) =>
    edition.playerSeason.map((row) => ({
      ...row,
      seasonName: edition.competition.season?.name ?? "Temporada",
      competitionName: edition.competition.name,
    }))
  );

  const matchIds = new Set(played.map((m) => m.id));
  const seriesStats = stats.filter((s) => matchIds.has(s.match_id));
  const historicalPlayers = aggregatePlayers(seriesStats);

  const finalRoundIds = new Set(
    rounds
      .filter((r) => r.stage === "FINAL")
      .map((r) => r.id)
  );
  const finalMatchIds = new Set(
    played
      .filter((m) => m.round_id && finalRoundIds.has(m.round_id))
      .map((m) => m.id)
  );
  const finalStats = aggregatePlayers(
    stats.filter((s) => finalMatchIds.has(s.match_id))
  );

  const cup = series.type !== "LEAGUE";

  return [
    mapRecord("titles", "Más títulos", titles, "títulos"),
    cup
      ? mapRecord(
          "finals",
          "Más finales disputadas",
          finals,
          "finales",
          editions.some((e) => e.finals.length > 0)
            ? undefined
            : "Marca las jornadas finales con stage = FINAL."
        )
      : unavailable("finals", "Más finales disputadas", "Solo copas."),
    series.type === "LEAGUE"
      ? maxRecord("points-season", "Más puntos en una temporada", teamSeasons, "points", "pts")
      : unavailable("points-season", "Más puntos en una temporada", "Solo ligas."),
    maxRecord("wins-season", "Más victorias en una temporada", teamSeasons, "won", "victorias"),
    maxRecord("goals-team-season", "Más goles en una temporada", teamSeasons, "gf", "goles"),
    minRecord("ga-season", "Menos goles encajados en una temporada", teamSeasons.filter((r) => r.played > 0), "ga", "goles"),
    biggestWinRecord(played),
    highestScoringMatchRecord(played),
    series.type === "LEAGUE" && series.tracks_promotions
      ? mapRecord("promotions", "Más ascensos", promotions, "ascensos")
      : unavailable("promotions", "Más ascensos", "Activa tracks_promotions y promoted_places para esta liga."),
    maxRecord("historical-goals", "Máximo goleador histórico", historicalPlayers, "goals", "goles"),
    maxRecord("season-goals", "Máximo goleador en una temporada", playerSeasons, "goals", "goles"),
    maxRecord("historical-assists", "Máximo asistente histórico", historicalPlayers, "assists", "asistencias"),
    maxRecord("season-assists", "Máximo asistente en una temporada", playerSeasons, "assists", "asistencias"),
    cup
      ? maxRecord(
          "final-goals",
          "Más goles en finales",
          finalStats,
          "goals",
          "goles",
          finalMatchIds.size > 0 ? undefined : "Marca las jornadas finales con stage = FINAL."
        )
      : unavailable("final-goals", "Más goles en finales", "Solo copas."),
  ];
}

function getChampion(edition: ReturnType<typeof buildEdition>) {
  if (edition.competition.status !== "FINISHED") return null;

  if (edition.competition.type === "LEAGUE") {
    return edition.standings[0]?.teamCode ?? null;
  }

  const final = edition.finals.at(-1);
  if (!final || final.home_score === final.away_score) return null;

  return final.home_score! > final.away_score!
    ? final.home_team_code
    : final.away_team_code;
}

function aggregatePlayers(stats: Stat[]) {
  const map = new Map<string, {
    playerId: string | null;
    playerName: string;
    teamCode: string;
    minutes: number;
    goals: number;
    assists: number;
  }>();

  for (const stat of stats) {
    const key = stat.player_id
      ? `id:${stat.player_id}`
      : `fallback:${stat.team_code}:${stat.esms_name}`;

    const row = map.get(key) ?? {
      playerId: stat.player_id,
      playerName: stat.esms_name,
      teamCode: stat.team_code,
      minutes: 0,
      goals: 0,
      assists: 0,
    };

    row.teamCode = stat.team_code;
    row.minutes += stat.minutes ?? 0;
    row.goals += stat.goals ?? 0;
    row.assists += stat.assists ?? 0;

    map.set(key, row);
  }

  return [...map.values()];
}

async function loadStats(matchIds: string[]): Promise<Stat[]> {
  if (matchIds.length === 0) return [];

  const supabase = getSupabaseAdmin();
  const result: Stat[] = [];

  for (let i = 0; i < matchIds.length; i += 10) {
    const chunk = matchIds.slice(i, i + 10);
    const { data, error } = await supabase
      .from("match_player_stats")
      .select("match_id,player_id,team_code,esms_name,minutes,goals,assists")
      .in("match_id", chunk);

    if (error) throw error;
    result.push(...((data ?? []) as Stat[]));
  }

  return result;
}

function add(map: Map<string, number>, key: string, value: number) {
  map.set(key, (map.get(key) ?? 0) + value);
}

function unavailable(key: string, title: string, note: string): RecordItem {
  return { key, title, holders: [], available: false, note };
}

function mapRecord(
  key: string,
  title: string,
  map: Map<string, number>,
  unit: string,
  note?: string
): RecordItem {
  if (map.size === 0) {
    return {
      key,
      title,
      unit,
      holders: [],
      available: !note,
      note: note ?? "Todavía no hay datos.",
    };
  }

  const max = Math.max(...map.values());

  return {
    key,
    title,
    unit,
    available: true,
    holders: [...map.entries()]
      .filter(([, value]) => value === max)
      .map(([teamCode, value]) => ({ teamCode, value })),
  };
}

function maxRecord(
  key: string,
  title: string,
  rows: any[],
  field: string,
  unit: string,
  note?: string
): RecordItem {
  if (rows.length === 0) {
    return { key, title, unit, holders: [], available: !note, note: note ?? "Todavía no hay datos." };
  }

  const max = Math.max(...rows.map((row) => Number(row[field] ?? 0)));
  const holders = rows
    .filter((row) => Number(row[field] ?? 0) === max)
    .map((row) => ({
      value: max,
      playerId: row.playerId,
      playerName: row.playerName,
      teamCode: row.teamCode,
      seasonName: row.seasonName,
      competitionName: row.competitionName,
    }));

  return { key, title, unit, holders, available: true, note };
}

function minRecord(
  key: string,
  title: string,
  rows: any[],
  field: string,
  unit: string
): RecordItem {
  if (rows.length === 0) {
    return { key, title, unit, holders: [], available: true, note: "Todavía no hay datos." };
  }

  const min = Math.min(...rows.map((row) => Number(row[field] ?? 0)));

  return {
    key,
    title,
    unit,
    available: true,
    holders: rows
      .filter((row) => Number(row[field] ?? 0) === min)
      .map((row) => ({
        value: min,
        teamCode: row.teamCode,
        seasonName: row.seasonName,
        competitionName: row.competitionName,
      })),
  };
}

function biggestWinRecord(matches: Match[]): RecordItem {
  if (matches.length === 0) {
    return { key: "biggest-win", title: "Mayor goleada", holders: [], available: true, note: "Todavía no hay partidos." };
  }

  const rows = matches.map((m) => {
    const diff = Math.abs(m.home_score! - m.away_score!);
    const winner =
      m.home_score! > m.away_score!
        ? m.home_team_code
        : m.away_score! > m.home_score!
          ? m.away_team_code
          : null;

    return { m, diff, winner };
  });

  const max = Math.max(...rows.map((r) => r.diff));

  return {
    key: "biggest-win",
    title: "Mayor goleada",
    unit: "goles de diferencia",
    available: true,
    holders: rows
      .filter((r) => r.diff === max)
      .map(({ m, diff, winner }) => ({
        value: diff,
        teamCode: winner ?? undefined,
        matchId: m.id,
        score: `${m.home_team_code} ${m.home_score}–${m.away_score} ${m.away_team_code}`,
      })),
  };
}

function highestScoringMatchRecord(matches: Match[]): RecordItem {
  if (matches.length === 0) {
    return { key: "highest-scoring", title: "Partido con más goles", holders: [], available: true, note: "Todavía no hay partidos." };
  }

  const max = Math.max(...matches.map((m) => m.home_score! + m.away_score!));

  return {
    key: "highest-scoring",
    title: "Partido con más goles",
    unit: "goles",
    available: true,
    holders: matches
      .filter((m) => m.home_score! + m.away_score! === max)
      .map((m) => ({
        value: max,
        matchId: m.id,
        score: `${m.home_team_code} ${m.home_score}–${m.away_score} ${m.away_team_code}`,
      })),
  };
}

function calculateWinStreaks(
  matches: Match[],
  editions: ReturnType<typeof buildEdition>[]
) {
  const result = new Map<string, number>();

  for (const edition of editions) {
    const editionMatches = matches
      .filter((m) => m.competition_id === edition.competition.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

    const current = new Map<string, number>();

    for (const match of editionMatches) {
      const homeWin = match.home_score! > match.away_score!;
      const awayWin = match.away_score! > match.home_score!;

      const homeCurrent = homeWin ? (current.get(match.home_team_code) ?? 0) + 1 : 0;
      const awayCurrent = awayWin ? (current.get(match.away_team_code) ?? 0) + 1 : 0;

      current.set(match.home_team_code, homeCurrent);
      current.set(match.away_team_code, awayCurrent);

      result.set(match.home_team_code, Math.max(result.get(match.home_team_code) ?? 0, homeCurrent));
      result.set(match.away_team_code, Math.max(result.get(match.away_team_code) ?? 0, awayCurrent));
    }
  }

  return result;
}

function streakRecord(streaks: Map<string, number>): RecordItem {
  return mapRecord(
    "win-streak",
    "Mayor racha de victorias",
    streaks,
    "victorias consecutivas"
  );
}
