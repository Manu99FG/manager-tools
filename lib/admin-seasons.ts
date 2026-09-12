import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type AdminSeasonStatus =
  | "ACTIVE"
  | "SCHEDULED"
  | "FINISHED";

type AdminSeason = {
  id: string;
  name: string;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminSeasonRow = {
  id: string;
  name: string;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  competitions: number;
  teams: number;
  matches: number;
  season: AdminSeason;
  status: AdminSeasonStatus;
  competitionCount: number;
  teamCount: number;
  matchCount: number;
};

type CompetitionRow = {
  id: string;
  season_id: string;
};

type TeamRow = {
  competition_id: string;
  team_code: string;
};

type MatchRow = {
  competition_id: string;
};

const PAGE_SIZE = 1000;

async function readAllRows<T>(
  table: string,
  select: string
): Promise<T[]> {
  const supabase = getSupabaseAdmin();
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const chunk = (data ?? []) as T[];
    rows.push(...chunk);

    if (chunk.length < PAGE_SIZE) break;
  }

  return rows;
}

export async function getAdminSeasonsData(): Promise<AdminSeasonRow[]> {
  const supabase = getSupabaseAdmin();

  const [
    seasonsResult,
    competitions,
    competitionTeams,
    matches,
  ] = await Promise.all([
    supabase
      .from("seasons")
      .select(
        "id,name,starts_at,ends_at,is_active,created_at,updated_at"
      )
      .order("starts_at", {
        ascending: false,
        nullsFirst: false,
      })
      .order("created_at", { ascending: false }),

    readAllRows<CompetitionRow>(
      "competitions",
      "id,season_id"
    ),

    readAllRows<TeamRow>(
      "competition_teams",
      "competition_id,team_code"
    ),

    readAllRows<MatchRow>(
      "matches",
      "competition_id"
    ),
  ]);

  if (seasonsResult.error) {
    throw seasonsResult.error;
  }

  const competitionById = new Map(
    competitions.map((competition) => [
      competition.id,
      competition,
    ])
  );

  const seasonCompetitionIds = new Map<string, Set<string>>();
  const seasonTeams = new Map<string, Set<string>>();
  const seasonMatches = new Map<string, number>();

  for (const competition of competitions) {
    const current =
      seasonCompetitionIds.get(competition.season_id) ??
      new Set<string>();

    current.add(competition.id);
    seasonCompetitionIds.set(
      competition.season_id,
      current
    );
  }

  for (const team of competitionTeams) {
    const competition =
      competitionById.get(team.competition_id);

    if (!competition) continue;

    const current =
      seasonTeams.get(competition.season_id) ??
      new Set<string>();

    current.add(team.team_code);
    seasonTeams.set(
      competition.season_id,
      current
    );
  }

  for (const match of matches) {
    const competition =
      competitionById.get(match.competition_id);

    if (!competition) continue;

    seasonMatches.set(
      competition.season_id,
      (seasonMatches.get(competition.season_id) ?? 0) + 1
    );
  }

  return (seasonsResult.data ?? []).map((season) => {
    const competitions =
      seasonCompetitionIds.get(season.id)?.size ?? 0;
    const teams = seasonTeams.get(season.id)?.size ?? 0;
    const matches = seasonMatches.get(season.id) ?? 0;
    const status = getSeasonStatus({
      isActive: season.is_active,
      startsAt: season.starts_at,
      endsAt: season.ends_at,
    });
    const nestedSeason: AdminSeason = {
      id: season.id,
      name: season.name,
      starts_at: season.starts_at,
      ends_at: season.ends_at,
      is_active: season.is_active,
      created_at: season.created_at,
      updated_at: season.updated_at,
    };

    return {
      id: season.id,
      name: season.name,
      startsAt: season.starts_at,
      endsAt: season.ends_at,
      isActive: season.is_active,
      createdAt: season.created_at,
      updatedAt: season.updated_at,
      competitions,
      teams,
      matches,
      season: nestedSeason,
      status,
      competitionCount: competitions,
      teamCount: teams,
      matchCount: matches,
    };
  });
}

function getSeasonStatus({
  isActive,
  startsAt,
  endsAt,
}: {
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}): AdminSeasonStatus {
  if (isActive) return "ACTIVE";

  const today = new Date().toISOString().slice(0, 10);

  if (startsAt && startsAt > today) {
    return "SCHEDULED";
  }

  if (endsAt && endsAt < today) {
    return "FINISHED";
  }

  return "SCHEDULED";
}
