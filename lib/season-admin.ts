import { getSupabaseAdmin } from "@/lib/supabase-admin";

import type { Season } from "@/lib/competition-types";

export type AdminSeasonRow = {
  season: Season;
  competitionCount: number;
  teamCount: number;
  matchCount: number;
};

export async function getAdminSeasonsOverview(): Promise<AdminSeasonRow[]> {
  const supabase = getSupabaseAdmin();

  const [
    seasonsResult,
    competitionsResult,
    teamsResult,
    matchesResult,
  ] = await Promise.all([
    supabase
      .from("seasons")
      .select("*")
      .order("starts_at", {
        ascending: false,
        nullsFirst: false,
      })
      .order("created_at", { ascending: false }),

    supabase
      .from("competitions")
      .select("id,season_id"),

    supabase
      .from("competition_teams")
      .select("competition_id,team_code"),

    supabase
      .from("matches")
      .select("competition_id,id"),
  ]);

  if (seasonsResult.error) throw seasonsResult.error;
  if (competitionsResult.error) throw competitionsResult.error;
  if (teamsResult.error) throw teamsResult.error;
  if (matchesResult.error) throw matchesResult.error;

  const seasons = (seasonsResult.data ?? []) as Season[];
  const competitions = (competitionsResult.data ?? []) as Array<{
    id: string;
    season_id: string;
  }>;
  const teams = (teamsResult.data ?? []) as Array<{
    competition_id: string;
    team_code: string;
  }>;
  const matches = (matchesResult.data ?? []) as Array<{
    competition_id: string;
    id: string;
  }>;

  const competitionToSeason = new Map<string, string>();
  const competitionCount = new Map<string, number>();

  for (const competition of competitions) {
    competitionToSeason.set(
      competition.id,
      competition.season_id
    );

    competitionCount.set(
      competition.season_id,
      (competitionCount.get(competition.season_id) ?? 0) + 1
    );
  }

  const teamSets = new Map<string, Set<string>>();
  for (const row of teams) {
    const seasonId =
      competitionToSeason.get(row.competition_id);

    if (!seasonId) continue;

    const set =
      teamSets.get(seasonId) ?? new Set<string>();

    set.add(row.team_code);
    teamSets.set(seasonId, set);
  }

  const matchCount = new Map<string, number>();
  for (const match of matches) {
    const seasonId =
      competitionToSeason.get(match.competition_id);

    if (!seasonId) continue;

    matchCount.set(
      seasonId,
      (matchCount.get(seasonId) ?? 0) + 1
    );
  }

  return seasons.map((season) => ({
    season,
    competitionCount:
      competitionCount.get(season.id) ?? 0,
    teamCount:
      teamSets.get(season.id)?.size ?? 0,
    matchCount:
      matchCount.get(season.id) ?? 0,
  }));
}
