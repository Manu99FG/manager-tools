import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type CompetitionSeries = {
  id: string;
  name: string;
  type: string;
  created_at: string;
};

type SeasonRow = {
  id: string;
  name: string;
};

type CompetitionRow = {
  id: string;
  series_id: string | null;
  season_id: string;
  name: string;
  type: string;
  status: string;
  points_win: number;
  points_draw: number;
  points_loss: number;
  season: SeasonRow | null;
};

type CompetitionTeamRow = {
  competition_id: string;
  team_code: string;
};

type MatchRow = {
  id: string;
  competition_id: string;
  home_team_code: string;
  away_team_code: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
};

type PlayerStatRow = {
  match_id: string;
  player_id: string | null;
  team_code: string;
  esms_name: string;
  minutes: number;
  goals: number;
  assists: number;
  mom: number;
  key_passes: number;
  tackles: number;
  saves: number;
};

export type HistoricalStandingRow = {
  teamCode: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export type CompetitionHistoryEdition = {
  competitionId: string;
  seasonName: string;
  status: string;
  championTeamCode: string | null;
  runnerUpTeamCode: string | null;
  thirdTeamCode: string | null;
  topScorer: {
    playerId: string | null;
    esmsName: string;
    teamCode: string;
    value: number;
  } | null;
};

export type HistoricalTeamRow = {
  teamCode: string;
  editions: number;
  titles: number;
  runnerUp: number;
  thirdPlaces: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export type HistoricalPlayerRow = {
  playerId: string | null;
  esmsName: string;
  teamCode: string;
  appearances: number;
  minutes: number;
  goals: number;
  assists: number;
  mom: number;
  keyPasses: number;
  tackles: number;
  saves: number;
};

export type CompetitionHistoryMatchRecord = {
  matchId: string;
  competitionId: string;
  seasonName: string;
  homeTeamCode: string;
  awayTeamCode: string;
  homeScore: number;
  awayScore: number;
};

export type CompetitionHistoryData = {
  series: CompetitionSeries;
  editions: CompetitionHistoryEdition[];
  teams: HistoricalTeamRow[];
  players: HistoricalPlayerRow[];
  records: {
    biggestWin: CompetitionHistoryMatchRecord | null;
    highestScoringMatch: CompetitionHistoryMatchRecord | null;
  };
  totals: {
    editions: number;
    completedEditions: number;
    matches: number;
    goals: number;
  };
};

export async function getCompetitionSeries(): Promise<CompetitionSeries[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("competition_series")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;

  return (data ?? []) as CompetitionSeries[];
}

export async function getCompetitionHistoryPreview(
  seriesId: string,
  limit = 5
): Promise<CompetitionHistoryEdition[]> {
  const supabase = getSupabaseAdmin();

  const { data: competitionsData, error: competitionsError } =
    await supabase
      .from("competitions")
      .select(
        "id,series_id,season_id,name,type,status,points_win,points_draw,points_loss,created_at,season:seasons(id,name)"
      )
      .eq("series_id", seriesId)
      .eq("status", "FINISHED")
      .order("created_at", { ascending: false })
      .limit(Math.max(limit * 2, limit));

  if (competitionsError) throw competitionsError;

  const competitions =
    (competitionsData ?? []) as unknown as CompetitionRow[];

  if (competitions.length === 0) return [];

  const competitionIds = competitions.map((row) => row.id);

  const [
    { data: teamsData, error: teamsError },
    { data: matchesData, error: matchesError },
  ] = await Promise.all([
    supabase
      .from("competition_teams")
      .select("competition_id,team_code")
      .in("competition_id", competitionIds),
    supabase
      .from("matches")
      .select(
        "id,competition_id,home_team_code,away_team_code,home_score,away_score,status"
      )
      .in("competition_id", competitionIds),
  ]);

  if (teamsError) throw teamsError;
  if (matchesError) throw matchesError;

  const teamsByCompetition = new Map<string, CompetitionTeamRow[]>();
  for (const team of (teamsData ?? []) as CompetitionTeamRow[]) {
    const list = teamsByCompetition.get(team.competition_id) ?? [];
    list.push(team);
    teamsByCompetition.set(team.competition_id, list);
  }

  const matchesByCompetition = new Map<string, MatchRow[]>();
  for (const match of (matchesData ?? []) as MatchRow[]) {
    const list = matchesByCompetition.get(match.competition_id) ?? [];
    list.push(match);
    matchesByCompetition.set(match.competition_id, list);
  }

  return competitions
    .map((competition) => {
      const standings = buildEditionStandings(
        competition,
        teamsByCompetition.get(competition.id) ?? [],
        matchesByCompetition.get(competition.id) ?? []
      );

      return {
        competitionId: competition.id,
        seasonName: competition.season?.name ?? "Temporada",
        status: competition.status,
        championTeamCode:
          competition.type === "LEAGUE"
            ? standings[0]?.teamCode ?? null
            : null,
        runnerUpTeamCode:
          competition.type === "LEAGUE"
            ? standings[1]?.teamCode ?? null
            : null,
        thirdTeamCode:
          competition.type === "LEAGUE"
            ? standings[2]?.teamCode ?? null
            : null,
        topScorer: null,
      } satisfies CompetitionHistoryEdition;
    })
    .filter((edition) => Boolean(edition.championTeamCode))
    .slice(0, limit);
}

export async function getCompetitionHistory(
  seriesId: string
): Promise<CompetitionHistoryData | null> {
  const supabase = getSupabaseAdmin();

  const { data: seriesData, error: seriesError } = await supabase
    .from("competition_series")
    .select("*")
    .eq("id", seriesId)
    .maybeSingle();

  if (seriesError) throw seriesError;
  if (!seriesData) return null;

  const series = seriesData as CompetitionSeries;

  const { data: competitionsData, error: competitionsError } =
    await supabase
      .from("competitions")
      .select("*, season:seasons(id,name)")
      .eq("series_id", seriesId)
      .order("created_at", { ascending: true });

  if (competitionsError) throw competitionsError;

  const competitions =
    (competitionsData ?? []) as unknown as CompetitionRow[];

  if (competitions.length === 0) {
    return {
      series,
      editions: [],
      teams: [],
      players: [],
      records: {
        biggestWin: null,
        highestScoringMatch: null,
      },
      totals: {
        editions: 0,
        completedEditions: 0,
        matches: 0,
        goals: 0,
      },
    };
  }

  const competitionIds = competitions.map((row) => row.id);

  const [
    { data: teamsData, error: teamsError },
    { data: matchesData, error: matchesError },
  ] = await Promise.all([
    supabase
      .from("competition_teams")
      .select("competition_id,team_code")
      .in("competition_id", competitionIds),
    supabase
      .from("matches")
      .select(
        "id,competition_id,home_team_code,away_team_code,home_score,away_score,status"
      )
      .in("competition_id", competitionIds),
  ]);

  if (teamsError) throw teamsError;
  if (matchesError) throw matchesError;

  const teams = (teamsData ?? []) as CompetitionTeamRow[];
  const matches = (matchesData ?? []) as MatchRow[];

  const playedMatches = matches.filter(
    (match) =>
      match.status === "PLAYED" &&
      match.home_score !== null &&
      match.away_score !== null
  );

  const playerStats = await getPlayerStatsForMatches(
    playedMatches.map((match) => match.id)
  );

  const statsByMatch = new Map<string, PlayerStatRow[]>();
  for (const stat of playerStats) {
    const list = statsByMatch.get(stat.match_id) ?? [];
    list.push(stat);
    statsByMatch.set(stat.match_id, list);
  }

  const teamsByCompetition = new Map<string, CompetitionTeamRow[]>();
  for (const team of teams) {
    const list = teamsByCompetition.get(team.competition_id) ?? [];
    list.push(team);
    teamsByCompetition.set(team.competition_id, list);
  }

  const matchesByCompetition = new Map<string, MatchRow[]>();
  for (const match of matches) {
    const list = matchesByCompetition.get(match.competition_id) ?? [];
    list.push(match);
    matchesByCompetition.set(match.competition_id, list);
  }

  const editionRows: CompetitionHistoryEdition[] = [];
  const historicalTeams = new Map<string, HistoricalTeamRow>();

  for (const competition of competitions) {
    const editionTeams = teamsByCompetition.get(competition.id) ?? [];
    const editionMatches = matchesByCompetition.get(competition.id) ?? [];

    const standings = buildEditionStandings(
      competition,
      editionTeams,
      editionMatches
    );

    const finished = competition.status === "FINISHED";

    const champion =
      finished && competition.type === "LEAGUE"
        ? standings[0]?.teamCode ?? null
        : null;

    const runnerUp =
      finished && competition.type === "LEAGUE"
        ? standings[1]?.teamCode ?? null
        : null;

    const third =
      finished && competition.type === "LEAGUE"
        ? standings[2]?.teamCode ?? null
        : null;

    const editionStats = editionMatches.flatMap(
      (match) => statsByMatch.get(match.id) ?? []
    );

    const editionPlayers = aggregatePlayers(editionStats);
    const topScorerRow = [...editionPlayers]
      .filter((row) => row.goals > 0)
      .sort(
        (a, b) =>
          b.goals - a.goals ||
          a.minutes - b.minutes ||
          a.esmsName.localeCompare(b.esmsName)
      )[0];

    editionRows.push({
      competitionId: competition.id,
      seasonName: competition.season?.name ?? "Temporada",
      status: competition.status,
      championTeamCode: champion,
      runnerUpTeamCode: runnerUp,
      thirdTeamCode: third,
      topScorer: topScorerRow
        ? {
            playerId: topScorerRow.playerId,
            esmsName: topScorerRow.esmsName,
            teamCode: topScorerRow.teamCode,
            value: topScorerRow.goals,
          }
        : null,
    });

    for (const row of standings) {
      let historical = historicalTeams.get(row.teamCode);

      if (!historical) {
        historical = {
          teamCode: row.teamCode,
          editions: 0,
          titles: 0,
          runnerUp: 0,
          thirdPlaces: 0,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
        };

        historicalTeams.set(row.teamCode, historical);
      }

      historical.editions += 1;
      historical.played += row.played;
      historical.won += row.won;
      historical.drawn += row.drawn;
      historical.lost += row.lost;
      historical.goalsFor += row.goalsFor;
      historical.goalsAgainst += row.goalsAgainst;
      historical.points += row.points;

      if (finished && competition.type === "LEAGUE") {
        if (row.position === 1) historical.titles += 1;
        if (row.position === 2) historical.runnerUp += 1;
        if (row.position === 3) historical.thirdPlaces += 1;
      }
    }
  }

  const historicalTeamRows = Array.from(historicalTeams.values())
    .map((row) => ({
      ...row,
      goalDifference: row.goalsFor - row.goalsAgainst,
    }))
    .sort(
      (a, b) =>
        b.titles - a.titles ||
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        a.teamCode.localeCompare(b.teamCode)
    );

  const historicalPlayers = aggregatePlayers(playerStats).sort(
    (a, b) =>
      b.goals - a.goals ||
      b.assists - a.assists ||
      b.mom - a.mom ||
      b.minutes - a.minutes ||
      a.esmsName.localeCompare(b.esmsName)
  );

  const totalGoals = playedMatches.reduce(
    (sum, match) =>
      sum + (match.home_score ?? 0) + (match.away_score ?? 0),
    0
  );

  const competitionById = new Map(
    competitions.map((competition) => [competition.id, competition])
  );

  let biggestWin: CompetitionHistoryMatchRecord | null = null;
  let biggestWinMargin = -1;
  let highestScoringMatch: CompetitionHistoryMatchRecord | null = null;
  let highestScoringTotal = -1;

  for (const match of playedMatches) {
    const homeScore = match.home_score ?? 0;
    const awayScore = match.away_score ?? 0;
    const margin = Math.abs(homeScore - awayScore);
    const total = homeScore + awayScore;
    const competition = competitionById.get(match.competition_id);

    const record: CompetitionHistoryMatchRecord = {
      matchId: match.id,
      competitionId: match.competition_id,
      seasonName: competition?.season?.name ?? "Temporada",
      homeTeamCode: match.home_team_code,
      awayTeamCode: match.away_team_code,
      homeScore,
      awayScore,
    };

    if (
      margin > biggestWinMargin ||
      (margin === biggestWinMargin &&
        total >
          ((biggestWin?.homeScore ?? 0) +
            (biggestWin?.awayScore ?? 0)))
    ) {
      biggestWin = record;
      biggestWinMargin = margin;
    }

    if (total > highestScoringTotal) {
      highestScoringMatch = record;
      highestScoringTotal = total;
    }
  }

  return {
    series,
    editions: editionRows.reverse(),
    teams: historicalTeamRows,
    players: historicalPlayers,
    records: {
      biggestWin,
      highestScoringMatch,
    },
    totals: {
      editions: competitions.length,
      completedEditions: competitions.filter(
        (competition) => competition.status === "FINISHED"
      ).length,
      matches: playedMatches.length,
      goals: totalGoals,
    },
  };
}

export async function getCompetitionSeriesAdminData() {
  const supabase = getSupabaseAdmin();

  const [
    { data: seriesData, error: seriesError },
    { data: competitionsData, error: competitionsError },
  ] = await Promise.all([
    supabase
      .from("competition_series")
      .select("*")
      .order("name", { ascending: true }),
    supabase
      .from("competitions")
      .select("id,name,type,status,series_id,season:seasons(id,name)")
      .order("created_at", { ascending: false }),
  ]);

  if (seriesError) throw seriesError;
  if (competitionsError) throw competitionsError;

  return {
    series: (seriesData ?? []) as CompetitionSeries[],
    competitions: (competitionsData ?? []).map((row) => {
      const rawSeason = row.season;
      const season = Array.isArray(rawSeason)
        ? (rawSeason[0] ?? null)
        : (rawSeason ?? null);

      return {
        id: String(row.id),
        name: String(row.name),
        type: String(row.type),
        status: String(row.status),
        series_id:
          typeof row.series_id === "string"
            ? row.series_id
            : null,
        season: season
          ? {
              id: String(season.id),
              name: String(season.name),
            }
          : null,
      };
    }),
  };
}

function buildEditionStandings(
  competition: CompetitionRow,
  teams: CompetitionTeamRow[],
  matches: MatchRow[]
): HistoricalStandingRow[] {
  const table = new Map<
    string,
    Omit<HistoricalStandingRow, "position" | "goalDifference">
  >();

  for (const team of teams) {
    table.set(team.team_code, {
      teamCode: team.team_code,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    });
  }

  for (const match of matches) {
    if (
      match.status !== "PLAYED" ||
      match.home_score === null ||
      match.away_score === null
    ) {
      continue;
    }

    const home = table.get(match.home_team_code);
    const away = table.get(match.away_team_code);

    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;

    home.goalsFor += match.home_score;
    home.goalsAgainst += match.away_score;

    away.goalsFor += match.away_score;
    away.goalsAgainst += match.home_score;

    if (match.home_score > match.away_score) {
      home.won += 1;
      away.lost += 1;
      home.points += competition.points_win;
      away.points += competition.points_loss;
    } else if (match.home_score < match.away_score) {
      away.won += 1;
      home.lost += 1;
      away.points += competition.points_win;
      home.points += competition.points_loss;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += competition.points_draw;
      away.points += competition.points_draw;
    }
  }

  return Array.from(table.values())
    .map((row) => ({
      ...row,
      position: 0,
      goalDifference: row.goalsFor - row.goalsAgainst,
    }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        a.teamCode.localeCompare(b.teamCode)
    )
    .map((row, index) => ({
      ...row,
      position: index + 1,
    }));
}

async function getPlayerStatsForMatches(
  matchIds: string[]
): Promise<PlayerStatRow[]> {
  if (matchIds.length === 0) return [];

  const supabase = getSupabaseAdmin();
  const result: PlayerStatRow[] = [];
  const CHUNK_SIZE = 10;
  const CONCURRENT_CHUNKS = 4;

  const chunks: string[][] = [];
  for (let index = 0; index < matchIds.length; index += CHUNK_SIZE) {
    chunks.push(matchIds.slice(index, index + CHUNK_SIZE));
  }

  for (let index = 0; index < chunks.length; index += CONCURRENT_CHUNKS) {
    const batch = chunks.slice(index, index + CONCURRENT_CHUNKS);

    const responses = await Promise.all(
      batch.map((chunk) =>
        supabase
          .from("match_player_stats")
          .select(
            "match_id,player_id,team_code,esms_name,minutes,goals,assists,mom,key_passes,tackles,saves"
          )
          .in("match_id", chunk)
      )
    );

    for (const { data, error } of responses) {
      if (error) throw error;
      result.push(...((data ?? []) as PlayerStatRow[]));
    }
  }

  return result;
}

function aggregatePlayers(
  stats: PlayerStatRow[]
): HistoricalPlayerRow[] {
  const map = new Map<string, HistoricalPlayerRow>();

  for (const stat of stats) {
    const key = stat.player_id
      ? `id:${stat.player_id}`
      : `fallback:${stat.team_code}:${stat.esms_name}`;

    let row = map.get(key);

    if (!row) {
      row = {
        playerId: stat.player_id,
        esmsName: stat.esms_name,
        teamCode: stat.team_code,
        appearances: 0,
        minutes: 0,
        goals: 0,
        assists: 0,
        mom: 0,
        keyPasses: 0,
        tackles: 0,
        saves: 0,
      };

      map.set(key, row);
    }

    row.teamCode = stat.team_code;
    row.appearances += stat.minutes > 0 ? 1 : 0;
    row.minutes += stat.minutes ?? 0;
    row.goals += stat.goals ?? 0;
    row.assists += stat.assists ?? 0;
    row.mom += stat.mom ?? 0;
    row.keyPasses += stat.key_passes ?? 0;
    row.tackles += stat.tackles ?? 0;
    row.saves += stat.saves ?? 0;
  }

  return Array.from(map.values());
}
