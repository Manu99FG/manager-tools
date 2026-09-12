import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { buildStandings } from "@/lib/competitions";
import { getCompetitionPlayerRankings } from "@/lib/competition-rankings";

import type {
  Competition,
  CompetitionMatch,
  CompetitionTeam,
  Season,
  StandingRow,
} from "@/lib/competition-types";

type CompetitionWithSeason = Competition & {
  season?: Season | null;
};

type RoundRow = {
  id: string;
  competition_id: string;
  number: number;
  stage: string | null;
};

export type SeasonPlayerRow = {
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

export type SeasonCompetitionSummary = {
  competition: CompetitionWithSeason;
  teams: CompetitionTeam[];
  matches: CompetitionMatch[];
  standings: StandingRow[];
  championTeamCode: string | null;
  runnerUpTeamCode: string | null;
  playedMatches: number;
  goals: number;
};

export type SeasonPageData = {
  season: Season;
  competitions: SeasonCompetitionSummary[];
  clubs: string[];
  players: SeasonPlayerRow[];
  totals: {
    competitions: number;
    finishedCompetitions: number;
    clubs: number;
    playedMatches: number;
    goals: number;
  };
};

export async function getSeasonsWithCounts() {
  const supabase = getSupabaseAdmin();

  const [{ data: seasonsData, error: seasonsError }, { data: competitionsData, error: competitionsError }] =
    await Promise.all([
      supabase.from("seasons").select("*").order("starts_at", { ascending: false, nullsFirst: false }),
      supabase.from("competitions").select("id,season_id,status"),
    ]);

  if (seasonsError) throw seasonsError;
  if (competitionsError) throw competitionsError;

  const competitions = (competitionsData ?? []) as Array<{
    id: string;
    season_id: string;
    status: string;
  }>;

  return ((seasonsData ?? []) as Season[]).map((season) => {
    const rows = competitions.filter((competition) => competition.season_id === season.id);

    return {
      season,
      competitions: rows.length,
      finished: rows.filter((competition) => competition.status === "FINISHED").length,
    };
  });
}

function getCupFinal(
  competitionId: string,
  rounds: RoundRow[],
  matches: CompetitionMatch[]
) {
  const finalRoundIds = rounds
    .filter(
      (round) =>
        round.competition_id === competitionId &&
        String(round.stage ?? "").toUpperCase() === "FINAL"
    )
    .sort((a, b) => a.number - b.number)
    .map((round) => round.id);

  const finalMatches = matches
    .filter(
      (match) =>
        finalRoundIds.includes(match.round_id ?? "") &&
        match.status === "PLAYED" &&
        match.home_score !== null &&
        match.away_score !== null
    )
    .sort((a, b) => {
      const aIndex = finalRoundIds.indexOf(a.round_id ?? "");
      const bIndex = finalRoundIds.indexOf(b.round_id ?? "");
      return aIndex - bIndex;
    });

  return finalMatches.at(-1) ?? null;
}

function getChampionAndRunnerUp(
  competition: Competition,
  standings: StandingRow[],
  rounds: RoundRow[],
  matches: CompetitionMatch[]
) {
  if (competition.status !== "FINISHED") {
    return {
      championTeamCode: null,
      runnerUpTeamCode: null,
    };
  }

  if (competition.type === "LEAGUE") {
    return {
      championTeamCode: standings[0]?.teamCode ?? null,
      runnerUpTeamCode: standings[1]?.teamCode ?? null,
    };
  }

  const final = getCupFinal(competition.id, rounds, matches);

  if (
    !final ||
    final.home_score === null ||
    final.away_score === null ||
    final.home_score === final.away_score
  ) {
    return {
      championTeamCode: null,
      runnerUpTeamCode: null,
    };
  }

  const homeWon = final.home_score > final.away_score;

  return {
    championTeamCode: homeWon ? final.home_team_code : final.away_team_code,
    runnerUpTeamCode: homeWon ? final.away_team_code : final.home_team_code,
  };
}

export async function getSeasonPageData(
  seasonId: string
): Promise<SeasonPageData | null> {
  const supabase = getSupabaseAdmin();

  const { data: seasonData, error: seasonError } = await supabase
    .from("seasons")
    .select("*")
    .eq("id", seasonId)
    .maybeSingle();

  if (seasonError) throw seasonError;
  if (!seasonData) return null;

  const season = seasonData as Season;

  const { data: competitionsData, error: competitionsError } = await supabase
    .from("competitions")
    .select("*")
    .eq("season_id", seasonId)
    .order("created_at", { ascending: true });

  if (competitionsError) throw competitionsError;

  const competitions = (competitionsData ?? []) as Competition[];

  if (competitions.length === 0) {
    return {
      season,
      competitions: [],
      clubs: [],
      players: [],
      totals: {
        competitions: 0,
        finishedCompetitions: 0,
        clubs: 0,
        playedMatches: 0,
        goals: 0,
      },
    };
  }

  const competitionIds = competitions.map((competition) => competition.id);

  const [
    { data: teamsData, error: teamsError },
    { data: matchesData, error: matchesError },
    { data: roundsData, error: roundsError },
  ] = await Promise.all([
    supabase
      .from("competition_teams")
      .select("*")
      .in("competition_id", competitionIds),
    supabase
      .from("matches")
      .select("*")
      .in("competition_id", competitionIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("competition_rounds")
      .select("id,competition_id,number,stage")
      .in("competition_id", competitionIds)
      .order("number", { ascending: true }),
  ]);

  if (teamsError) throw teamsError;
  if (matchesError) throw matchesError;
  if (roundsError) throw roundsError;

  const teams = (teamsData ?? []) as CompetitionTeam[];
  const matches = (matchesData ?? []) as CompetitionMatch[];
  const rounds = (roundsData ?? []) as RoundRow[];

  const playerRankings = await Promise.all(
    competitions.map((competition) =>
      getCompetitionPlayerRankings(competition.id)
    )
  );

  const playerMap = new Map<string, SeasonPlayerRow>();

  for (const ranking of playerRankings) {
    for (const row of ranking) {
      const key = row.playerId ?? `${row.teamCode}::${row.esmsName}`;
      const current = playerMap.get(key) ?? {
        playerId: row.playerId,
        esmsName: row.esmsName,
        teamCode: row.teamCode,
        appearances: 0,
        minutes: 0,
        goals: 0,
        assists: 0,
        mom: 0,
        keyPasses: 0,
        tackles: 0,
        saves: 0,
      };

      current.teamCode = row.teamCode;
      current.appearances += row.appearances;
      current.minutes += row.minutes;
      current.goals += row.goals;
      current.assists += row.assists;
      current.mom += row.mom;
      current.keyPasses += row.keyPasses;
      current.tackles += row.tackles;
      current.saves += row.saves;

      playerMap.set(key, current);
    }
  }

  const summaries = competitions.map((competition) => {
    const competitionTeams = teams.filter(
      (team) => team.competition_id === competition.id
    );

    const competitionMatches = matches.filter(
      (match) => match.competition_id === competition.id
    );

    const standings = buildStandings(
      competition,
      competitionTeams,
      competitionMatches
    );

    const played = competitionMatches.filter(
      (match) =>
        match.status === "PLAYED" &&
        match.home_score !== null &&
        match.away_score !== null
    );

    const { championTeamCode, runnerUpTeamCode } =
      getChampionAndRunnerUp(
        competition,
        standings,
        rounds,
        competitionMatches
      );

    return {
      competition,
      teams: competitionTeams,
      matches: competitionMatches,
      standings,
      championTeamCode,
      runnerUpTeamCode,
      playedMatches: played.length,
      goals: played.reduce(
        (sum, match) =>
          sum + (match.home_score ?? 0) + (match.away_score ?? 0),
        0
      ),
    };
  });

  const clubs = Array.from(
    new Set(teams.map((team) => team.team_code))
  ).sort();

  return {
    season,
    competitions: summaries,
    clubs,
    players: Array.from(playerMap.values()),
    totals: {
      competitions: competitions.length,
      finishedCompetitions: competitions.filter(
        (competition) => competition.status === "FINISHED"
      ).length,
      clubs: clubs.length,
      playedMatches: summaries.reduce(
        (sum, competition) => sum + competition.playedMatches,
        0
      ),
      goals: summaries.reduce(
        (sum, competition) => sum + competition.goals,
        0
      ),
    },
  };
}
