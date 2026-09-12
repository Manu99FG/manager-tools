import {
  getSupabaseAdmin,
} from "@/lib/supabase-admin";

import {
  getClubName,
} from "@/lib/club-names";

export type LineupSubmissionTeam = {
  code: string;
  name: string;
};

export type LineupSubmissionCompetition = {
  id: string;
  name: string;
  slug: string;
  teams: LineupSubmissionTeam[];
};

export async function getLineupSubmissionCompetitions(): Promise<
  LineupSubmissionCompetition[]
> {
  const supabase =
    getSupabaseAdmin();

  const {
    data: competitions,
    error: competitionsError,
  } = await supabase
    .from("competitions")
    .select(
      "id, name, slug, status"
    )
    .eq(
      "status",
      "ACTIVE"
    )
    .order(
      "name",
      {
        ascending: true,
      }
    );

  if (
    competitionsError
  ) {
    throw competitionsError;
  }

  const competitionIds =
    (
      competitions ??
      []
    ).map(
      (competition) =>
        competition.id
    );

  if (
    competitionIds.length ===
    0
  ) {
    return [];
  }

  const {
    data: competitionTeams,
    error: teamsError,
  } = await supabase
    .from(
      "competition_teams"
    )
    .select(
      "competition_id, team_code"
    )
    .in(
      "competition_id",
      competitionIds
    )
    .order(
      "team_code",
      {
        ascending: true,
      }
    );

  if (
    teamsError
  ) {
    throw teamsError;
  }

  const teamsByCompetition =
    new Map<
      string,
      LineupSubmissionTeam[]
    >();

  for (
    const row of
      competitionTeams ??
      []
  ) {
    const code =
      String(
        row.team_code
      ).toUpperCase();

    const list =
      teamsByCompetition.get(
        row.competition_id
      ) ?? [];

    list.push({
      code,
      name:
        getClubName(
          code
        ),
    });

    teamsByCompetition.set(
      row.competition_id,
      list
    );
  }

  return (
    competitions ??
    []
  ).map(
    (
      competition
    ) => ({
      id:
        competition.id,

      name:
        competition.name,

      slug:
        competition.slug,

      teams:
        teamsByCompetition.get(
          competition.id
        ) ?? [],
    })
  );
}
