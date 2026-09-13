import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { rankStandings } from "@/lib/standings-ranking";

export type ClubStatsSeason = { id: string; name: string; isActive: boolean };
export type ClubStatsCompetition = {
  id: string;
  name: string;
  type: "LEAGUE" | "CUP" | "GROUPS" | "GROUPS_KNOCKOUT" | "SUPERCUP";
  status: "DRAFT" | "ACTIVE" | "FINISHED";
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
};
export type ClubStatsStandingRow = {
  position: number;
  teamCode: string;
  groupName: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  noPresented: number;
  points: number;
};
export type ClubStatsCompetitionTable = {
  competitionId: string;
  groupName: string | null;
  rows: ClubStatsStandingRow[];
};
export type ClubStatsPlayer = {
  playerId: string | null;
  esmsName: string;
  displayName: string;
  photoUrl: string | null;
  nationality: string | null;
  age: number | null;
  position: string;
  st: number | null;
  tk: number | null;
  ps: number | null;
  sh: number | null;
  ag: number | null;
  kab: number | null;
  tab: number | null;
  pab: number | null;
  sab: number | null;
  fit: number | null;
  appearances: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  saves: number;
  conceded: number;
  tackles: number;
  keyPasses: number;
  shots: number;
  mom: number;
  discipline: number;
  yellowCards: number;
  redCards: number;
  cleanSheets: number;
  disciplineByCompetition?: Record<string, { yellow: number; red: number; dp: number }>;
};
export type ClubStatsForm = { matchId: string; result: "V" | "E" | "D"; gf: number; ga: number };
export type ClubStatsMatch = { matchId: string; competitionId: string; competitionName: string; date: string; home: boolean; opponentCode: string; gf: number; ga: number; result: "V" | "E" | "D"; yellowCards?: number; redCards?: number; discipline?: number };
export type ClubStatisticsData = {
  season: ClubStatsSeason | null;
  seasons: ClubStatsSeason[];
  competitions: ClubStatsCompetition[];
  competitionTables: ClubStatsCompetitionTable[];
  selectedCompetitionId: string | null;
  team: {
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    shots: number;
    tackles: number;
    keyPasses: number;
    saves: number;
    discipline: number;
    yellowCards: number;
    redCards: number;
  };
  players: ClubStatsPlayer[];
  form: ClubStatsForm[];
  matches: ClubStatsMatch[];
};

type AnyRow = Record<string, any>;
function n(value: unknown) { const valueNumber = Number(value ?? 0); return Number.isFinite(valueNumber) ? valueNumber : 0; }
function nullableN(value: unknown) { if (value === null || value === undefined || value === "") return null; const valueNumber = Number(value); return Number.isFinite(valueNumber) ? valueNumber : null; }

export async function getClubStatistics(teamCodeInput: string, requestedSeasonId?: string | null, requestedCompetitionId?: string | null): Promise<ClubStatisticsData> {
  const teamCode = teamCodeInput.toUpperCase();
  const supabase = getSupabaseAdmin();

  const seasonsResult = await supabase.from("seasons").select("id,name,is_active,created_at").order("created_at", { ascending: false });
  if (seasonsResult.error) throw seasonsResult.error;
  const seasons: ClubStatsSeason[] = ((seasonsResult.data ?? []) as AnyRow[]).map((row) => ({ id: String(row.id), name: String(row.name), isActive: Boolean(row.is_active) }));
  const season = seasons.find((item) => requestedSeasonId && item.id === requestedSeasonId) ?? seasons.find((item) => item.isActive) ?? seasons[0] ?? null;
  if (!season) return empty(null, seasons);

  const [competitionsResult, membershipsResult, playersResult] = await Promise.all([
    supabase.from("competitions").select("id,name,season_id,type,status,points_win,points_draw,points_loss").eq("season_id", season.id).order("created_at", { ascending: true }),
    supabase.from("competition_teams").select("competition_id,team_code").eq("team_code", teamCode),
    supabase.from("players").select("id,esms_name,full_name,photo_url,nationality,current_team_code"),
  ]);
  for (const result of [competitionsResult, membershipsResult, playersResult]) if (result.error) throw result.error;

  const membershipIds = new Set(((membershipsResult.data ?? []) as AnyRow[]).map((row) => String(row.competition_id)));
  const competitions = ((competitionsResult.data ?? []) as AnyRow[])
    .filter((row) => membershipIds.has(String(row.id)))
    .map((row) => ({ id: String(row.id), name: String(row.name), type: String(row.type) as ClubStatsCompetition["type"], status: String(row.status) as ClubStatsCompetition["status"], pointsWin: n(row.points_win ?? 3), pointsDraw: n(row.points_draw ?? 1), pointsLoss: n(row.points_loss ?? 0) }));
  const competitionIds = competitions.map((item) => item.id);
  const selectedCompetitionId = requestedCompetitionId && competitionIds.includes(requestedCompetitionId) ? requestedCompetitionId : null;
  const scopedCompetitionIds = selectedCompetitionId ? [selectedCompetitionId] : competitionIds;
  if (!scopedCompetitionIds.length) return empty(season, seasons, competitions, selectedCompetitionId);

  const playerRows = (playersResult.data ?? []) as AnyRow[];
  const currentTeamPlayerIds = playerRows.filter((row) => String(row.current_team_code ?? "").toUpperCase() === teamCode).map((row) => String(row.id));
  const snapshotResult = currentTeamPlayerIds.length
    ? await supabase.from("latest_player_snapshots").select("player_id,age,st,tk,ps,sh,ag,kab,tab,pab,sab,fit").in("player_id", currentTeamPlayerIds)
    : { data: [], error: null } as any;
  if (snapshotResult.error) throw snapshotResult.error;

  const [matchesResult, competitionTeamsResult, statsResult] = await Promise.all([
    supabase.from("matches")
      .select("id,competition_id,home_team_code,away_team_code,home_score,away_score,status,home_no_show,away_no_show,scheduled_at,played_at,created_at")
      .in("competition_id", scopedCompetitionIds),
    supabase.from("competition_teams")
      .select("competition_id,team_code,group_name")
      .in("competition_id", scopedCompetitionIds),
    supabase.from("match_player_stats")
      .select("match_id,player_id,esms_name,team_code,position_at_match,participated,minutes,mom,saves,conceded,tackles,key_passes,shots,goals,assists,dp,matches!inner(competition_id)")
      .eq("team_code", teamCode),
  ]);
  if (matchesResult.error) throw matchesResult.error;
  if (competitionTeamsResult.error) throw competitionTeamsResult.error;
  if (statsResult.error) throw statsResult.error;

  const allCompetitionMatchRows = (matchesResult.data ?? []) as AnyRow[];
  const playedMatches = allCompetitionMatchRows
    .filter((row) => (String(row.home_team_code) === teamCode || String(row.away_team_code) === teamCode) && String(row.status) === "PLAYED" && row.home_score !== null && row.away_score !== null)
    .map((row) => {
      const home = String(row.home_team_code) === teamCode;
      const gf = home ? n(row.home_score) : n(row.away_score);
      const ga = home ? n(row.away_score) : n(row.home_score);
      const competitionId = String(row.competition_id);
      const competitionName = competitions.find((item) => item.id === competitionId)?.name ?? "Competición";
      const opponentCode = home ? String(row.away_team_code) : String(row.home_team_code);
      return { id: String(row.id), competitionId, competitionName, home, opponentCode, gf, ga, date: String(row.scheduled_at ?? row.played_at ?? row.created_at ?? "") };
    });

  const team = playedMatches.reduce((acc, match) => {
    acc.played += 1; acc.goalsFor += match.gf; acc.goalsAgainst += match.ga;
    if (match.gf > match.ga) acc.wins += 1; else if (match.gf < match.ga) acc.losses += 1; else acc.draws += 1;
    return acc;
  }, { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, shots: 0, tackles: 0, keyPasses: 0, saves: 0, discipline: 0, yellowCards: 0, redCards: 0 });

  const playerMeta = new Map(playerRows.map((row) => [String(row.id), row]));
  const snapshotMeta = new Map(((snapshotResult.data ?? []) as AnyRow[]).map((row) => [String(row.player_id), row]));
  const aggregates = new Map<string, ClubStatsPlayer & { __positions?: Map<string, number> }>();
  const disciplineByMatch = new Map<string, { yellow: number; red: number; dp: number }>();
  for (const row of (statsResult.data ?? []) as AnyRow[]) {
    const joined = Array.isArray(row.matches) ? row.matches[0] : row.matches;
    if (!joined || !scopedCompetitionIds.includes(String(joined.competition_id))) continue;
    const key = String(row.player_id ?? row.esms_name ?? "unknown");
    const meta = row.player_id ? playerMeta.get(String(row.player_id)) : null;
    const snapshot = row.player_id ? snapshotMeta.get(String(row.player_id)) : null;
    const current = aggregates.get(key) ?? {
      playerId: row.player_id ? String(row.player_id) : null,
      esmsName: String(row.esms_name ?? "Jugador"),
      displayName: String(meta?.full_name ?? row.esms_name ?? "Jugador").replaceAll("_", " "),
      photoUrl: meta?.photo_url ? String(meta.photo_url) : null,
      nationality: meta?.nationality ? String(meta.nationality) : null,
      age: nullableN(snapshot?.age),
      position: String(row.position_at_match ?? "-").toUpperCase(),
      st: nullableN(snapshot?.st), tk: nullableN(snapshot?.tk), ps: nullableN(snapshot?.ps), sh: nullableN(snapshot?.sh), ag: nullableN(snapshot?.ag),
      kab: nullableN(snapshot?.kab), tab: nullableN(snapshot?.tab), pab: nullableN(snapshot?.pab), sab: nullableN(snapshot?.sab), fit: nullableN(snapshot?.fit),
      appearances: 0, starts: 0, minutes: 0, goals: 0, assists: 0, saves: 0, conceded: 0,
      tackles: 0, keyPasses: 0, shots: 0, mom: 0, discipline: 0, yellowCards: 0, redCards: 0, cleanSheets: 0,
      disciplineByCompetition: {},
      __positions: new Map<string, number>(),
    };
    const position = String(row.position_at_match ?? "-").toUpperCase();
    current.__positions?.set(position, (current.__positions?.get(position) ?? 0) + 1);
    current.appearances += n(row.participated);
    current.starts += n(row.participated) > 0 && n(row.minutes) >= 60 ? 1 : 0;
    current.minutes += n(row.minutes);
    current.goals += n(row.goals);
    current.assists += n(row.assists);
    current.saves += n(row.saves);
    current.conceded += n(row.conceded);
    current.tackles += n(row.tackles);
    current.keyPasses += n(row.key_passes);
    current.shots += n(row.shots);
    current.mom += n(row.mom);
    const dp = n(row.dp);
    const competitionId = String(joined.competition_id);
    const matchId = String(row.match_id);
    current.discipline += dp;
    if (dp === 1) current.yellowCards += 1;
    if (dp === 10) current.redCards += 1;
    const compDiscipline = current.disciplineByCompetition?.[competitionId] ?? { yellow: 0, red: 0, dp: 0 };
    compDiscipline.dp += dp;
    if (dp === 1) compDiscipline.yellow += 1;
    if (dp === 10) compDiscipline.red += 1;
    if (current.disciplineByCompetition) current.disciplineByCompetition[competitionId] = compDiscipline;
    const matchDiscipline = disciplineByMatch.get(matchId) ?? { yellow: 0, red: 0, dp: 0 };
    matchDiscipline.dp += dp;
    if (dp === 1) matchDiscipline.yellow += 1;
    if (dp === 10) matchDiscipline.red += 1;
    disciplineByMatch.set(matchId, matchDiscipline);
    if (position === "GK" && n(row.participated) > 0 && n(row.conceded) === 0) current.cleanSheets += 1;
    aggregates.set(key, current);

    team.shots += n(row.shots);
    team.tackles += n(row.tackles);
    team.keyPasses += n(row.key_passes);
    team.saves += n(row.saves);
    team.discipline += dp;
    if (dp === 1) team.yellowCards += 1;
    if (dp === 10) team.redCards += 1;
  }

  const competitionTeamRows = (competitionTeamsResult.data ?? []) as AnyRow[];
  const competitionTables: ClubStatsCompetitionTable[] = [];
  for (const competition of competitions) {
    if (!["LEAGUE", "GROUPS", "GROUPS_KNOCKOUT"].includes(competition.type)) continue;
    const members = competitionTeamRows.filter((row) => String(row.competition_id) === competition.id);
    const groups = competition.type === "LEAGUE"
      ? [null]
      : [...new Set(members.map((row) => row.group_name ? String(row.group_name) : null).filter(Boolean))] as string[];
    const groupList: (string | null)[] = groups.length ? groups : [null];
    for (const groupName of groupList) {
      const groupMembers = groupName === null ? members : members.filter((row) => String(row.group_name ?? "") === groupName);
      const codes = new Set(groupMembers.map((row) => String(row.team_code)));
      if (!codes.size) continue;
      const table = new Map<string, Omit<ClubStatsStandingRow, "position" | "goalDifference">>();
      for (const row of groupMembers) table.set(String(row.team_code), { teamCode: String(row.team_code), groupName, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, noPresented: 0, points: 0 });
      for (const match of allCompetitionMatchRows) {
        if (String(match.competition_id) !== competition.id || String(match.status) !== "PLAYED" || match.home_score === null || match.away_score === null) continue;
        const homeCode = String(match.home_team_code), awayCode = String(match.away_team_code);
        if (!codes.has(homeCode) || !codes.has(awayCode)) continue;
        const home = table.get(homeCode), away = table.get(awayCode);
        if (!home || !away) continue;
        const hs = n(match.home_score), as = n(match.away_score);
        home.played++; away.played++; if (match.home_no_show) home.noPresented++; if (match.away_no_show) away.noPresented++; home.goalsFor += hs; home.goalsAgainst += as; away.goalsFor += as; away.goalsAgainst += hs;
        if (hs > as) { home.wins++; away.losses++; home.points += competition.pointsWin; away.points += competition.pointsLoss; }
        else if (hs < as) { away.wins++; home.losses++; away.points += competition.pointsWin; home.points += competition.pointsLoss; }
        else { home.draws++; away.draws++; home.points += competition.pointsDraw; away.points += competition.pointsDraw; }
      }
      const unsortedRows = [...table.values()].map((row) => ({ ...row, position: 0, goalDifference: row.goalsFor - row.goalsAgainst }));
      const rankingMatches = allCompetitionMatchRows
        .filter((match) => String(match.competition_id) === competition.id && codes.has(String(match.home_team_code)) && codes.has(String(match.away_team_code)))
        .map((match) => ({
          homeTeamCode: String(match.home_team_code),
          awayTeamCode: String(match.away_team_code),
          homeScore: match.home_score === null ? null : n(match.home_score),
          awayScore: match.away_score === null ? null : n(match.away_score),
          status: String(match.status),
        }));
      const rows = rankStandings(unsortedRows, rankingMatches, { win: competition.pointsWin, draw: competition.pointsDraw, loss: competition.pointsLoss })
        .map((row,index) => ({ ...row, position: index + 1 }));
      competitionTables.push({ competitionId: competition.id, groupName, rows });
    }
  }

  const players = [...aggregates.values()].filter((player) => player.appearances > 0 || player.minutes > 0).map((player) => {
    const preferred = [...(player.__positions?.entries() ?? [])].sort((a,b) => b[1]-a[1])[0]?.[0] ?? player.position;
    const { __positions, ...clean } = player;
    return { ...clean, position: preferred };
  });
  const chronological = [...playedMatches].sort((a, b) => a.date.localeCompare(b.date));
  const matches: ClubStatsMatch[] = chronological.map((match) => {
    const discipline = disciplineByMatch.get(match.id) ?? { yellow: 0, red: 0, dp: 0 };
    return {
      matchId: match.id, competitionId: match.competitionId, competitionName: match.competitionName, date: match.date, home: match.home, opponentCode: match.opponentCode, gf: match.gf, ga: match.ga, result: match.gf > match.ga ? "V" : match.gf < match.ga ? "D" : "E",
      yellowCards: discipline.yellow, redCards: discipline.red, discipline: discipline.dp,
    };
  });
  const form: ClubStatsForm[] = matches.slice(-5).map((match) => ({ matchId: match.matchId, result: match.result, gf: match.gf, ga: match.ga }));

  return { season, seasons, competitions, competitionTables, selectedCompetitionId, team, players, form, matches };
}

function empty(season: ClubStatsSeason | null, seasons: ClubStatsSeason[], competitions: ClubStatsCompetition[] = [], selectedCompetitionId: string | null = null): ClubStatisticsData {
  return { season, seasons, competitions, competitionTables: [], selectedCompetitionId, team: { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, shots: 0, tackles: 0, keyPasses: 0, saves: 0, discipline: 0, yellowCards: 0, redCards: 0 }, players: [], form: [], matches: [] };
}
