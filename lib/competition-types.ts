export type CompetitionType =
  | "LEAGUE"
  | "CUP"
  | "GROUPS"
  | "GROUPS_KNOCKOUT"
  | "SUPERCUP";

export type CompetitionStatus =
  | "DRAFT"
  | "ACTIVE"
  | "FINISHED";

export type MatchStatus =
  | "SCHEDULED"
  | "PLAYED"
  | "POSTPONED"
  | "CANCELLED";

export type StandingTiebreaker =
  | "GOAL_DIFFERENCE"
  | "GOALS_FOR"
  | "WINS"
  | "HEAD_TO_HEAD_POINTS"
  | "HEAD_TO_HEAD_GOAL_DIFFERENCE"
  | "HEAD_TO_HEAD_GOALS_FOR"
  | "FEWER_NO_SHOWS";

export type Season = {
  id: string;
  name: string;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Competition = {
  id: string;
  season_id: string;
  name: string;
  slug: string;
  type: CompetitionType;
  status: CompetitionStatus;
  points_win: number;
  points_draw: number;
  points_loss: number;
  home_and_away: boolean;
  created_at: string;
  updated_at: string;
};

export type CompetitionTeam = {
  id: string;
  competition_id: string;
  team_code: string;
  seed: number | null;
  group_name: string | null;
  created_at: string;
};

export type CompetitionRound = {
  id: string;
  competition_id: string;
  number: number;
  name: string;
  stage: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

export type CompetitionMatch = {
  id: string;
  competition_id: string;
  round_id: string | null;
  home_team_code: string;
  away_team_code: string;
  home_score: number | null;
  away_score: number | null;
  status: MatchStatus;
  scheduled_at: string | null;
  played_at: string | null;
  esms_source: string | null;

  home_no_show: boolean;
  away_no_show: boolean;

  /**
   * Marcador original del .stt.
   * Solo se rellena cuando existe un NO PRESENTADO.
   */
  stt_home_score: number | null;
  stt_away_score: number | null;

  created_at: string;
  updated_at: string;
};

export type StandingRow = {
  position: number;
  teamCode: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;

  /**
   * NP = número de partidos en los que el club no presentó alineación.
   */
  noPresented: number;

  points: number;
};

export type CompetitionQualificationRule = {
  id: string;
  source_competition_id: string;
  group_name: string;
  start_position: number;
  end_position: number;
  destination_competition_id: string;
  created_at: string;
  updated_at: string;
};

export type GroupStanding = {
  groupName: string;
  standings: StandingRow[];
};
