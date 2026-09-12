import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { buildStandings } from "@/lib/competitions";
import { getCompetitionHistory } from "@/lib/competition-history";

type AnyRow = Record<string, any>;

export type ClubCompetitionSeason = { id: string; name: string; isActive: boolean };
export type ClubCompetitionSummary = {
  id: string;
  seriesId: string | null;
  name: string;
  type: string;
  status: string;
  seasonId: string;
  seasonName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position: number | null;
  groupName: string | null;
  resultLabel: string;
  lastRound: string | null;
  nextMatch: {
    id: string;
    opponentCode: string;
    roundLabel: string | null;
    date: string | null;
  } | null;
  qualification: { destinationId: string; destinationName: string } | null;
  playoffSummary: string | null;
  isChampion: boolean;
  isRunnerUp: boolean;
};

export type ClubCompetitionsData = {
  seasons: ClubCompetitionSeason[];
  season: ClubCompetitionSeason | null;
  current: ClubCompetitionSummary[];
  history: ClubCompetitionSummary[];
  historicalSummary: {
    uniqueCompetitions: number;
    participations: number;
    titles: number;
    runnerUps: number;
  };
  palmaresByCompetition: Array<{
    name: string;
    seriesId: string | null;
    titles: number;
    runnerUps: number;
    titleSeasons: string[];
  }>;
  best: {
    leaguePosition: ClubCompetitionSummary | null;
    points: ClubCompetitionSummary | null;
    wins: ClubCompetitionSummary | null;
    goalsFor: ClubCompetitionSummary | null;
    goalsAgainst: ClubCompetitionSummary | null;
    goalDifference: ClubCompetitionSummary | null;
  };
};

function n(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateValue(value: string | null) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : Number.MAX_SAFE_INTEGER;
}

function competitionRoundLabel(round: AnyRow | undefined | null) {
  if (!round) return null;
  const name = String(round.name ?? "").trim();
  if (name) return name;
  const number = Number(round.number ?? 0);
  return number > 0 ? `Jornada ${number}` : null;
}

function isPlayed(match: AnyRow) {
  return String(match.status) === "PLAYED" && match.home_score !== null && match.away_score !== null;
}

function clubMatchStats(teamCode: string, competition: AnyRow, matches: AnyRow[]) {
  let played = 0, wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0, points = 0;
  for (const match of matches) {
    if (!isPlayed(match)) continue;
    const home = String(match.home_team_code) === teamCode;
    const gf = home ? n(match.home_score) : n(match.away_score);
    const ga = home ? n(match.away_score) : n(match.home_score);
    played += 1;
    goalsFor += gf;
    goalsAgainst += ga;
    if (gf > ga) { wins += 1; points += n(competition.points_win ?? 3); }
    else if (gf === ga) { draws += 1; points += n(competition.points_draw ?? 1); }
    else { losses += 1; points += n(competition.points_loss ?? 0); }
  }
  return { played, wins, draws, losses, goalsFor, goalsAgainst, goalDifference: goalsFor - goalsAgainst, points };
}

function playoffAscensoSummary(
  teamCode: string,
  teamMatches: AnyRow[],
  roundById: Map<string, AnyRow>
) {
  const playoffMatches = teamMatches
    .map((match) => ({
      match,
      round: match.round_id ? roundById.get(String(match.round_id)) : null,
    }))
    .filter(({ round }) => {
      const stage = String(round?.stage ?? "").toUpperCase();
      const name = String(round?.name ?? "").toLocaleLowerCase("es");
      return name.includes("playoff") || name.includes("ascenso") || stage === "SEMIFINAL" || stage === "FINAL";
    });

  if (!playoffMatches.length) return null;

  const final = playoffMatches.find(({ round }) =>
    String(round?.stage ?? "").toUpperCase() === "FINAL" ||
    String(round?.name ?? "").toLocaleLowerCase("es").includes("final")
  );

  if (final) {
    if (!isPlayed(final.match)) return "Playoff de ascenso: final pendiente";
    const home = String(final.match.home_team_code) === teamCode;
    const gf = home ? n(final.match.home_score) : n(final.match.away_score);
    const ga = home ? n(final.match.away_score) : n(final.match.home_score);
    return gf > ga ? "Playoff de ascenso: ganador" : "Playoff de ascenso: finalista";
  }

  const semifinal = playoffMatches.find(({ round }) =>
    String(round?.stage ?? "").toUpperCase() === "SEMIFINAL" ||
    String(round?.name ?? "").toLocaleLowerCase("es").includes("semifinal")
  );

  if (semifinal) {
    if (!isPlayed(semifinal.match)) return "Playoff de ascenso: semifinal pendiente";
    const home = String(semifinal.match.home_team_code) === teamCode;
    const gf = home ? n(semifinal.match.home_score) : n(semifinal.match.away_score);
    const ga = home ? n(semifinal.match.away_score) : n(semifinal.match.home_score);
    return gf > ga ? "Playoff de ascenso: clasificado a la final" : "Playoff de ascenso: semifinalista";
  }

  return "Playoff de ascenso";
}

export async function getClubCompetitions(teamCodeInput: string, requestedSeasonId?: string | null): Promise<ClubCompetitionsData> {
  const teamCode = teamCodeInput.toUpperCase();
  const supabase = getSupabaseAdmin();

  const [seasonsR, membershipsR, competitionsR] = await Promise.all([
    supabase.from("seasons").select("id,name,is_active,created_at").order("created_at", { ascending: false }),
    supabase.from("competition_teams").select("competition_id,team_code,group_name").eq("team_code", teamCode),
    supabase.from("competitions").select("id,series_id,season_id,name,type,status,points_win,points_draw,points_loss,created_at,season:seasons(id,name)").order("created_at", { ascending: false }),
  ]);
  for (const result of [seasonsR, membershipsR, competitionsR]) if (result.error) throw result.error;

  const seasons: ClubCompetitionSeason[] = ((seasonsR.data ?? []) as AnyRow[]).map((row) => ({
    id: String(row.id), name: String(row.name), isActive: Boolean(row.is_active),
  }));
  const season = seasons.find((s) => requestedSeasonId && s.id === requestedSeasonId) ?? seasons.find((s) => s.isActive) ?? seasons[0] ?? null;

  const membershipRows = (membershipsR.data ?? []) as AnyRow[];
  const membershipByComp = new Map(membershipRows.map((row) => [String(row.competition_id), row]));
  const competitions = ((competitionsR.data ?? []) as AnyRow[]).filter((row) => membershipByComp.has(String(row.id)));
  const ids = competitions.map((row) => String(row.id));

  if (!ids.length) {
    return {
      seasons, season, current: [], history: [],
      historicalSummary: { uniqueCompetitions: 0, participations: 0, titles: 0, runnerUps: 0 },
      palmaresByCompetition: [],
      best: { leaguePosition: null, points: null, wins: null, goalsFor: null, goalsAgainst: null, goalDifference: null },
    };
  }

  const [allTeamsR, matchesR, roundsR, qualificationR, destinationsR] = await Promise.all([
    supabase.from("competition_teams").select("competition_id,team_code,group_name,seed").in("competition_id", ids),
    supabase.from("matches").select("id,competition_id,round_id,home_team_code,away_team_code,home_score,away_score,status,scheduled_at,played_at,created_at").in("competition_id", ids),
    supabase.from("competition_rounds").select("id,competition_id,number,name,stage").in("competition_id", ids),
    supabase.from("competition_qualification_rules").select("source_competition_id,group_name,start_position,end_position,destination_competition_id").in("source_competition_id", ids),
    supabase.from("competitions").select("id,name,season_id"),
  ]);
  for (const result of [allTeamsR, matchesR, roundsR, qualificationR, destinationsR]) if (result.error) throw result.error;

  const allTeams = (allTeamsR.data ?? []) as AnyRow[];
  const allMatches = (matchesR.data ?? []) as AnyRow[];
  const rounds = (roundsR.data ?? []) as AnyRow[];
  const qualificationRules = (qualificationR.data ?? []) as AnyRow[];
  const destinationById = new Map(((destinationsR.data ?? []) as AnyRow[]).map((row) => [String(row.id), row]));
  const roundById = new Map(rounds.map((r) => [String(r.id), r]));

  const seriesIds = Array.from(new Set(competitions.map((c) => c.series_id ? String(c.series_id) : null).filter(Boolean))) as string[];
  const histories = await Promise.all(seriesIds.map(async (seriesId) => [seriesId, await getCompetitionHistory(seriesId)] as const));
  const historyBySeries = new Map(histories);

  const summaries: ClubCompetitionSummary[] = competitions.map((competition) => {
    const id = String(competition.id);
    const membership = membershipByComp.get(id);
    const compTeams = allTeams.filter((row) => String(row.competition_id) === id);
    const compMatches = allMatches.filter((row) => String(row.competition_id) === id);
    const type = String(competition.type);
    const compRoundIds = new Set(
      rounds
        .filter((round) => String(round.competition_id) === id)
        .filter((round) => !["SEMIFINAL", "FINAL", "PLAYOFF"].includes(String(round.stage ?? "REGULAR").toUpperCase()))
        .map((round) => String(round.id))
    );
    const regularMatches = type === "LEAGUE"
      ? compMatches.filter((match) => !match.round_id || compRoundIds.has(String(match.round_id)))
      : compMatches;
    const teamMatches = compMatches.filter((row) => String(row.home_team_code) === teamCode || String(row.away_team_code) === teamCode);
    const stats = clubMatchStats(teamCode, competition, teamMatches);
    const groupName = membership?.group_name ? String(membership.group_name) : null;

    let position: number | null = null;
    if (type === "LEAGUE") {
      position = buildStandings(competition as never, compTeams as never, regularMatches as never).find((row) => row.teamCode === teamCode)?.position ?? null;
    } else if (type === "GROUPS" || type === "GROUPS_KNOCKOUT") {
      const groupTeams = groupName ? compTeams.filter((row) => String(row.group_name ?? "") === groupName) : compTeams;
      const codes = new Set(groupTeams.map((row) => String(row.team_code)));
      const groupMatches = compMatches.filter((row) => codes.has(String(row.home_team_code)) && codes.has(String(row.away_team_code)));
      position = buildStandings(competition as never, groupTeams as never, groupMatches as never).find((row) => row.teamCode === teamCode)?.position ?? null;
    }

    const edition = competition.series_id ? historyBySeries.get(String(competition.series_id))?.editions.find((e) => e.competitionId === id) : null;
    const isChampion = edition?.championTeamCode === teamCode;
    const isRunnerUp = edition?.runnerUpTeamCode === teamCode;

    const playedWithRound = teamMatches.filter(isPlayed).map((m) => ({ match: m, round: m.round_id ? roundById.get(String(m.round_id)) : null }));
    playedWithRound.sort((a, b) => n(b.round?.number) - n(a.round?.number) || dateValue(String(b.match.played_at ?? b.match.scheduled_at ?? b.match.created_at ?? "")) - dateValue(String(a.match.played_at ?? a.match.scheduled_at ?? a.match.created_at ?? "")));
    const lastRound = competitionRoundLabel(playedWithRound[0]?.round);

    const upcoming = teamMatches.filter((m) => !isPlayed(m)).sort((a, b) => dateValue(String(a.scheduled_at ?? a.created_at ?? "")) - dateValue(String(b.scheduled_at ?? b.created_at ?? "")))[0] ?? null;
    const upcomingRound = upcoming?.round_id ? roundById.get(String(upcoming.round_id)) : null;
    const nextMatch = upcoming ? {
      id: String(upcoming.id),
      opponentCode: String(upcoming.home_team_code) === teamCode ? String(upcoming.away_team_code) : String(upcoming.home_team_code),
      roundLabel: competitionRoundLabel(upcomingRound),
      date: upcoming.scheduled_at ? String(upcoming.scheduled_at) : null,
    } : null;

    const rule = qualificationRules.find((row) => {
      if (String(row.source_competition_id) !== id || position === null) return false;
      const ruleGroup = row.group_name ? String(row.group_name) : null;
      if (ruleGroup && ruleGroup !== groupName) return false;
      return position >= n(row.start_position) && position <= n(row.end_position);
    });
    const dest = rule ? destinationById.get(String(rule.destination_competition_id)) : null;
    const qualification = dest ? { destinationId: String(dest.id), destinationName: String(dest.name) } : null;
    const playoffSummary = playoffAscensoSummary(teamCode, teamMatches, roundById);

    let resultLabel = "Participación";
    if (isChampion) resultLabel = "Campeón";
    else if (isRunnerUp) resultLabel = "Subcampeón";
    else if (position !== null) resultLabel = `${position}.º${groupName ? ` (${groupName})` : ""}`;
    else if (lastRound) resultLabel = lastRound;
    if (String(competition.status) !== "FINISHED" && resultLabel !== "Campeón" && resultLabel !== "Subcampeón") resultLabel += " *";

    const rawSeason = Array.isArray(competition.season) ? competition.season[0] : competition.season;
    return {
      id,
      seriesId: competition.series_id ? String(competition.series_id) : null,
      name: String(competition.name),
      type,
      status: String(competition.status),
      seasonId: String(competition.season_id),
      seasonName: String(rawSeason?.name ?? seasons.find((s) => s.id === String(competition.season_id))?.name ?? "Temporada"),
      ...stats,
      position,
      groupName,
      resultLabel,
      lastRound,
      nextMatch,
      qualification,
      playoffSummary,
      isChampion,
      isRunnerUp,
    };
  });

  const current = season ? summaries.filter((item) => item.seasonId === season.id).sort((a, b) => a.name.localeCompare(b.name, "es")) : [];
  const history = [...summaries].sort((a, b) => b.seasonName.localeCompare(a.seasonName, "es", { numeric: true }) || a.name.localeCompare(b.name, "es"));
  const uniqueNames = new Set(history.map((item) => item.name.trim().toLowerCase()));
  const titles = history.filter((item) => item.isChampion).length;
  const runnerUps = history.filter((item) => item.isRunnerUp).length;

  const palmaresMap = new Map<string, { name: string; seriesId: string | null; titles: number; runnerUps: number; titleSeasons: string[] }>();
  for (const item of history) {
    const key = item.seriesId ?? item.name.toLowerCase();
    const row = palmaresMap.get(key) ?? { name: item.name, seriesId: item.seriesId, titles: 0, runnerUps: 0, titleSeasons: [] };
    if (item.isChampion) { row.titles += 1; row.titleSeasons.push(item.seasonName); }
    if (item.isRunnerUp) row.runnerUps += 1;
    palmaresMap.set(key, row);
  }

  const leagueRows = history.filter((item) => item.position !== null && (item.type === "LEAGUE" || item.type === "GROUPS"));
  const completed = history.filter((item) => item.played > 0);
  const pickMax = (fn: (item: ClubCompetitionSummary) => number) => [...completed].sort((a, b) => fn(b) - fn(a))[0] ?? null;
  const pickMin = (fn: (item: ClubCompetitionSummary) => number) => [...completed].sort((a, b) => fn(a) - fn(b))[0] ?? null;

  return {
    seasons,
    season,
    current,
    history,
    historicalSummary: { uniqueCompetitions: uniqueNames.size, participations: history.length, titles, runnerUps },
    palmaresByCompetition: [...palmaresMap.values()].sort((a, b) => b.titles - a.titles || b.runnerUps - a.runnerUps || a.name.localeCompare(b.name, "es")),
    best: {
      leaguePosition: [...leagueRows].sort((a, b) => (a.position ?? 999) - (b.position ?? 999) || b.points - a.points)[0] ?? null,
      points: pickMax((x) => x.points),
      wins: pickMax((x) => x.wins),
      goalsFor: pickMax((x) => x.goalsFor),
      goalsAgainst: pickMin((x) => x.goalsAgainst),
      goalDifference: pickMax((x) => x.goalDifference),
    },
  };
}
