import {
  getSupabaseAdmin,
} from "@/lib/supabase-admin";

export type MatchDetailPlayerStat = {
  id: string;
  match_id: string;
  player_id: string | null;
  team_code: string;
  esms_name: string;

  participated: number;
  came_on_as_sub: number;
  minutes: number;
  mom: number;

  saves: number;
  conceded: number;
  tackles: number;
  key_passes: number;
  shots: number;
  goals: number;
  assists: number;

  dp: number;
  injury: number;

  kab_delta: number;
  tab_delta: number;
  pab_delta: number;
  sab_delta: number;

  reserved_value: number;
  fitness: number;

  source_file: string | null;
  imported_at: string;
};

export type MatchDetailMatch = {
  id: string;
  competition_id: string;
  round_id: string | null;
  home_team_code: string;
  away_team_code: string;
  home_score: number | null;
  away_score: number | null;
  status:
    | "SCHEDULED"
    | "PLAYED"
    | "POSTPONED"
    | "CANCELLED";
  scheduled_at: string | null;
  played_at: string | null;
  esms_source: string | null;
};

export type MatchDetailCompetition = {
  id: string;
  name: string;
  slug: string;
  type:
    | "LEAGUE"
    | "CUP"
    | "GROUPS"
    | "GROUPS_KNOCKOUT"
    | "SUPERCUP";
  season_id: string;
};

export type MatchDetailRound = {
  id: string;
  number: number;
  name: string;
};

export type MatchDetailSeason = {
  id: string;
  name: string;
};

export type MatchDetailData = {
  match:
    MatchDetailMatch;
  competition:
    MatchDetailCompetition;
  season:
    MatchDetailSeason | null;
  round:
    MatchDetailRound | null;
  stats:
    MatchDetailPlayerStat[];
};

export async function getMatchDetail(
  matchId: string
): Promise<
  MatchDetailData | null
> {
  const supabase =
    getSupabaseAdmin();

  const {
    data: matchData,
    error: matchError,
  } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();

  if (
    matchError ||
    !matchData
  ) {
    return null;
  }

  const match =
    matchData as
      MatchDetailMatch;

  const [
    competitionResult,
    roundResult,
    statsResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "competitions"
        )
        .select(
          "id, name, slug, type, season_id"
        )
        .eq(
          "id",
          match.competition_id
        )
        .maybeSingle(),

      match.round_id
        ? supabase
            .from(
              "competition_rounds"
            )
            .select(
              "id, number, name"
            )
            .eq(
              "id",
              match.round_id
            )
            .maybeSingle()
        : Promise.resolve({
            data: null,
            error: null,
          }),

      supabase
        .from(
          "match_player_stats"
        )
        .select("*")
        .eq(
          "match_id",
          match.id
        )
        .order(
          "team_code",
          {
            ascending: true,
          }
        )
        .order(
          "minutes",
          {
            ascending: false,
          }
        ),
    ]);

  if (
    competitionResult.error ||
    !competitionResult.data
  ) {
    return null;
  }

  if (
    statsResult.error
  ) {
    throw statsResult.error;
  }

  const competition =
    competitionResult.data as
      MatchDetailCompetition;

  const seasonResult =
    await supabase
      .from("seasons")
      .select(
        "id, name"
      )
      .eq(
        "id",
        competition.season_id
      )
      .maybeSingle();

  return {
    match,
    competition,

    season:
      seasonResult.data
        ? (seasonResult.data as
            MatchDetailSeason)
        : null,

    round:
      roundResult.data
        ? (roundResult.data as
            MatchDetailRound)
        : null,

    stats:
      (statsResult.data ??
        []) as
        MatchDetailPlayerStat[],
  };
}
