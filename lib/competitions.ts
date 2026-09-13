import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { rankStandings } from "@/lib/standings-ranking";

import type {
  Competition,
  CompetitionMatch,
  CompetitionRound,
  CompetitionTeam,
  CompetitionQualificationRule,
  GroupStanding,
  Season,
  StandingRow,
} from "@/lib/competition-types";

export async function getSeasons(): Promise<Season[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as Season[];
}

export async function getCompetitions(): Promise<
  Array<Competition & { season: Season | null }>
> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("competitions")
    .select(`*, season:seasons(*)`)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as Array<
    Competition & { season: Season | null }
  >;
}

export type CompetitionCounts = {
  teamCount: number;
  roundCount: number;
  matchCount: number;
};

const COUNT_PAGE_SIZE = 1000;

async function getPagedCompetitionIds(
  table: "competition_teams" | "competition_rounds" | "matches"
): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const ids: string[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("competition_id")
      .order("competition_id", { ascending: true })
      .range(from, from + COUNT_PAGE_SIZE - 1);

    if (error) throw error;

    const rows = data ?? [];
    for (const row of rows) {
      if (typeof row.competition_id === "string") ids.push(row.competition_id);
    }

    if (rows.length < COUNT_PAGE_SIZE) break;
    from += COUNT_PAGE_SIZE;
  }

  return ids;
}

export async function getCompetitionCounts(): Promise<
  Record<string, CompetitionCounts>
> {
  const supabase = getSupabaseAdmin();

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "manager_tools_competition_counts"
  );

  if (!rpcError) {
    const result: Record<string, CompetitionCounts> = {};

    for (const row of rpcData ?? []) {
      const id = String(row.competition_id);
      result[id] = {
        teamCount: Number(row.team_count ?? 0),
        roundCount: Number(row.round_count ?? 0),
        matchCount: Number(row.match_count ?? 0),
      };
    }

    return result;
  }

  // Compatibilidad antes de ejecutar el SQL de rendimiento.
  // Sigue evitando el N+1 y pagina para no caer en el límite de 1000 filas.
  const [teamIds, roundIds, matchIds] = await Promise.all([
    getPagedCompetitionIds("competition_teams"),
    getPagedCompetitionIds("competition_rounds"),
    getPagedCompetitionIds("matches"),
  ]);

  const result: Record<string, CompetitionCounts> = {};
  const bump = (id: string, key: keyof CompetitionCounts) => {
    const current = result[id] ?? { teamCount: 0, roundCount: 0, matchCount: 0 };
    current[key] += 1;
    result[id] = current;
  };

  for (const id of teamIds) bump(id, "teamCount");
  for (const id of roundIds) bump(id, "roundCount");
  for (const id of matchIds) bump(id, "matchCount");

  return result;
}

export async function getCompetitionPageData(
  competitionId: string
) {
  const supabase = getSupabaseAdmin();

  const [
    competitionResult,
    teamsResult,
    roundsResult,
    matchesResult,
    qualificationRulesResult,
    siblingCompetitionsResult,
  ] = await Promise.all([
    supabase
      .from("competitions")
      .select(`id,season_id,name,slug,type,status,points_win,points_draw,points_loss,home_and_away,created_at,updated_at,series_id,season:seasons(id,name,starts_at,ends_at,is_active,created_at,updated_at)`)
      .eq("id", competitionId)
      .maybeSingle(),

    supabase
      .from("competition_teams")
      .select("id,competition_id,team_code,seed,group_name,created_at")
      .eq("competition_id", competitionId)
      .order("seed", {
        ascending: true,
        nullsFirst: false,
      }),

    supabase
      .from("competition_rounds")
      .select("id,competition_id,number,name,stage,starts_at,ends_at,created_at")
      .eq("competition_id", competitionId)
      .order("number", { ascending: true }),

    supabase
      .from("matches")
      .select("id,competition_id,round_id,home_team_code,away_team_code,home_score,away_score,status,scheduled_at,played_at,esms_source,home_no_show,away_no_show,stt_home_score,stt_away_score,created_at,updated_at")
      .eq("competition_id", competitionId)
      .order("created_at", { ascending: true }),

    supabase
      .from("competition_qualification_rules")
      .select("id,source_competition_id,group_name,start_position,end_position,destination_competition_id,created_at,updated_at")
      .eq("source_competition_id", competitionId)
      .order("group_name", { ascending: true })
      .order("start_position", { ascending: true }),

    supabase
      .from("competitions")
      .select("id,season_id,name,slug,type,status,points_win,points_draw,points_loss,home_and_away,created_at,updated_at")
      .neq("id", competitionId)
      .order("name", { ascending: true }),
  ]);

  if (competitionResult.error) {
    throw competitionResult.error;
  }

  if (teamsResult.error) {
    throw teamsResult.error;
  }

  if (roundsResult.error) {
    throw roundsResult.error;
  }

  if (matchesResult.error) {
    throw matchesResult.error;
  }

  // La tabla se añade en V31.24. Si aún no se ha ejecutado la migración,
  // dejamos que el error sea visible para no simular que las reglas existen.
  if (qualificationRulesResult.error) {
    throw qualificationRulesResult.error;
  }

  if (siblingCompetitionsResult.error) {
    throw siblingCompetitionsResult.error;
  }

  const competition = competitionResult.data as
    | (Competition & { season: Season | null })
    | null;

  if (!competition) return null;

  const teams = (teamsResult.data ?? []) as CompetitionTeam[];
  const rounds = (roundsResult.data ?? []) as CompetitionRound[];
  const matches = (matchesResult.data ?? []) as CompetitionMatch[];
  const knockoutStages = new Set([
    "ROUND_OF_16",
    "QUARTERFINAL",
    "SEMIFINAL",
    "FINAL",
    "PLAYOFF",
  ]);
  const regularRoundIds = new Set(
    rounds
      .filter((round) => {
        const stage = String(round.stage ?? "REGULAR").toUpperCase();
        return !knockoutStages.has(stage);
      })
      .map((round) => round.id)
  );
  const regularMatches =
    competition.type === "LEAGUE"
      ? matches.filter((match) => !match.round_id || regularRoundIds.has(match.round_id))
      : matches;
  const qualificationRules = (qualificationRulesResult.data ?? []) as CompetitionQualificationRule[];
  const siblingCompetitions = ((siblingCompetitionsResult.data ?? []) as Competition[])
    .filter((item) => item.season_id === competition.season_id);

  return {
    competition,
    teams,
    rounds,
    matches,
    qualificationRules,
    siblingCompetitions,
    standings: buildStandings(
      competition,
      teams,
      regularMatches
    ),
    groupStandings: buildGroupStandings(competition, teams, matches.filter((match) => !match.round_id || regularRoundIds.has(match.round_id))),
  };
}

export function buildGroupStandings(
  competition: Competition,
  teams: CompetitionTeam[],
  matches: CompetitionMatch[]
): GroupStanding[] {
  const grouped = new Map<string, CompetitionTeam[]>();

  for (const team of teams) {
    const groupName = team.group_name?.trim();
    if (!groupName) continue;
    const current = grouped.get(groupName) ?? [];
    current.push(team);
    grouped.set(groupName, current);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "es", { numeric: true }))
    .map(([groupName, groupTeams]) => {
      const teamCodes = new Set(groupTeams.map((team) => team.team_code));
      const groupMatches = matches.filter(
        (match) =>
          teamCodes.has(match.home_team_code) &&
          teamCodes.has(match.away_team_code)
      );

      return {
        groupName,
        standings: buildStandings(competition, groupTeams, groupMatches),
      };
    });
}

export function buildStandings(
  competition: Competition,
  teams: CompetitionTeam[],
  matches: CompetitionMatch[]
): StandingRow[] {
  const table = new Map<
    string,
    Omit<StandingRow, "position" | "goalDifference">
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
      noPresented: 0,
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

    if (match.home_no_show) {
      home.noPresented += 1;
    }

    if (match.away_no_show) {
      away.noPresented += 1;
    }

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

  const rows = Array.from(table.values()).map((row) => ({
    ...row,
    position: 0,
    goalDifference: row.goalsFor - row.goalsAgainst,
  }));

  return rankStandings(
    rows,
    matches.map((match) => ({
      homeTeamCode: match.home_team_code,
      awayTeamCode: match.away_team_code,
      homeScore: match.home_score,
      awayScore: match.away_score,
      status: match.status,
    })),
    {
      win: competition.points_win,
      draw: competition.points_draw,
      loss: competition.points_loss,
    }
  ).map((row, index) => ({ ...row, position: index + 1 }));
}
