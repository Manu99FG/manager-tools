import { getClubName } from "@/lib/club-names";
import { getDropboxClient } from "@/lib/dropbox";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const LINEUPS_FOLDER =
  "/ESO - Evolution Soccer Online/Alineaciones";

export type AdminLineupTeamStatus = {
  teamCode: string;
  teamName: string;
  fileName: string;
  sent: boolean;
  modified: string | null;
  dropboxPath: string | null;
  opponentCode: string | null;
  opponentName: string | null;
  isHome: boolean | null;
  matchId: string | null;
};

export type AdminLineupRound = {
  id: string;
  number: number;
  name: string;
  totalTeams: number;
  sentCount: number;
  pendingCount: number;
  teams: AdminLineupTeamStatus[];
};

export type AdminLineupCompetition = {
  id: string;
  name: string;
  slug: string;
  status: string;
  rounds: AdminLineupRound[];
};

function sanitizeDropboxFolderName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function getRoundFolderName(round: {
  number: number;
  name: string | null;
}) {
  const raw =
    round.name?.trim() ||
    `Jornada ${round.number}`;

  return sanitizeDropboxFolderName(raw);
}

async function getDropboxFilesForCompetition(
  competitionName: string
) {
  const dropbox = await getDropboxClient();

  const competitionFolder =
    sanitizeDropboxFolderName(
      competitionName
    );

  const folder =
    `${LINEUPS_FOLDER}/${competitionFolder}`;

  const files =
    new Map<
      string,
      {
        path: string;
        modified: string;
      }
    >();

  try {
    let response =
      await dropbox.filesListFolder({
        path: folder,
        recursive: true,
      });

    while (true) {
      for (const entry of response.result.entries) {
        if (entry[".tag"] !== "file") continue;

        const path =
          entry.path_display ??
          entry.path_lower;

        if (!path) continue;

        const prefix =
          `${folder}/`;

        const relativePath =
          path
            .slice(prefix.length)
            .replace(/\\/g, "/")
            .toLowerCase();

        files.set(relativePath, {
          path,
          modified:
            entry.server_modified,
        });
      }

      if (!response.result.has_more) break;

      response =
        await dropbox.filesListFolderContinue({
          cursor: response.result.cursor,
        });
    }
  } catch (error) {
    const status =
      (error as { status?: number }).status;

    if (status !== 409) {
      throw error;
    }
  }

  return files;
}

export async function getAdminLineupCompetitions(): Promise<
  AdminLineupCompetition[]
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
    .order("name", {
      ascending: true,
    });

  if (competitionsError) {
    throw competitionsError;
  }

  const competitionIds =
    (competitions ?? []).map(
      (competition) =>
        competition.id
    );

  if (
    competitionIds.length === 0
  ) {
    return [];
  }

  const [
    roundsResult,
    matchesResult,
  ] = await Promise.all([
    supabase
      .from("competition_rounds")
      .select(
        "id, competition_id, number, name"
      )
      .in(
        "competition_id",
        competitionIds
      )
      .order("number", {
        ascending: true,
      }),

    supabase
      .from("matches")
      .select(
        "id, competition_id, round_id, home_team_code, away_team_code, status"
      )
      .in(
        "competition_id",
        competitionIds
      )
      .order("created_at", {
        ascending: true,
      }),
  ]);

  if (roundsResult.error) {
    throw roundsResult.error;
  }

  if (matchesResult.error) {
    throw matchesResult.error;
  }

  const roundsByCompetition =
    new Map<
      string,
      Array<{
        id: string;
        competition_id: string;
        number: number;
        name: string | null;
      }>
    >();

  for (
    const round of
      roundsResult.data ?? []
  ) {
    const current =
      roundsByCompetition.get(
        round.competition_id
      ) ?? [];

    current.push({
      id: round.id,
      competition_id:
        round.competition_id,
      number: round.number,
      name: round.name,
    });

    roundsByCompetition.set(
      round.competition_id,
      current
    );
  }

  const matchesByRound =
    new Map<
      string,
      Array<{
        id: string;
        home_team_code: string;
        away_team_code: string;
        status: string;
      }>
    >();

  for (
    const match of
      matchesResult.data ?? []
  ) {
    if (!match.round_id) {
      continue;
    }

    const current =
      matchesByRound.get(
        match.round_id
      ) ?? [];

    current.push({
      id: match.id,

      home_team_code:
        String(
          match.home_team_code
        ).toUpperCase(),

      away_team_code:
        String(
          match.away_team_code
        ).toUpperCase(),

      status:
        String(
          match.status
        ),
    });

    matchesByRound.set(
      match.round_id,
      current
    );
  }

  const result:
    AdminLineupCompetition[] =
    [];

  for (
    const competition of
      competitions ?? []
  ) {
    const dropboxFiles =
      await getDropboxFilesForCompetition(
        competition.name
      );

    const competitionRounds =
      roundsByCompetition.get(
        competition.id
      ) ?? [];

    const rounds:
      AdminLineupRound[] =
      competitionRounds.map(
        (round) => {
          const roundMatches =
            matchesByRound.get(
              round.id
            ) ?? [];

          const roundFolder =
            getRoundFolderName(
              round
            );

          const teams:
            AdminLineupTeamStatus[] =
            [];

          for (
            const match of
              roundMatches
          ) {
            const homeCode =
              match.home_team_code;

            const awayCode =
              match.away_team_code;

            const homeFileName =
              `${homeCode}sht.txt`;

            const awayFileName =
              `${awayCode}sht.txt`;

            const homeKey =
              `${roundFolder}/${homeFileName}`.toLowerCase();

            const awayKey =
              `${roundFolder}/${awayFileName}`.toLowerCase();

            const homeFile =
              dropboxFiles.get(
                homeKey
              );

            const awayFile =
              dropboxFiles.get(
                awayKey
              );

            teams.push({
              teamCode:
                homeCode,

              teamName:
                getClubName(
                  homeCode
                ),

              fileName:
                homeFileName,

              sent:
                Boolean(
                  homeFile
                ),

              modified:
                homeFile?.modified ??
                null,

              dropboxPath:
                homeFile?.path ??
                null,

              opponentCode:
                awayCode,

              opponentName:
                getClubName(
                  awayCode
                ),

              isHome:
                true,

              matchId:
                match.id,
            });

            teams.push({
              teamCode:
                awayCode,

              teamName:
                getClubName(
                  awayCode
                ),

              fileName:
                awayFileName,

              sent:
                Boolean(
                  awayFile
                ),

              modified:
                awayFile?.modified ??
                null,

              dropboxPath:
                awayFile?.path ??
                null,

              opponentCode:
                homeCode,

              opponentName:
                getClubName(
                  homeCode
                ),

              isHome:
                false,

              matchId:
                match.id,
            });
          }

          const sentCount =
            teams.filter(
              (team) =>
                team.sent
            ).length;

          return {
            id:
              round.id,

            number:
              round.number,

            name:
              round.name?.trim() ||
              `Jornada ${round.number}`,

            totalTeams:
              teams.length,

            sentCount,

            pendingCount:
              teams.length -
              sentCount,

            teams,
          };
        }
      );

    result.push({
      id:
        competition.id,

      name:
        competition.name,

      slug:
        competition.slug,

      status:
        competition.status,

      rounds,
    });
  }

  return result;
}

export async function getAdminLineupDownloadPath({
  competitionId,
  roundId,
  teamCode,
}: {
  competitionId: string;
  roundId: string;
  teamCode: string;
}) {
  const supabase =
    getSupabaseAdmin();

  const [
    competitionResult,
    roundResult,
    matchResult,
  ] = await Promise.all([
    supabase
      .from("competitions")
      .select("id, name")
      .eq(
        "id",
        competitionId
      )
      .maybeSingle(),

    supabase
      .from("competition_rounds")
      .select(
        "id, competition_id, number, name"
      )
      .eq(
        "id",
        roundId
      )
      .eq(
        "competition_id",
        competitionId
      )
      .maybeSingle(),

    supabase
      .from("matches")
      .select(
        "id, home_team_code, away_team_code"
      )
      .eq(
        "competition_id",
        competitionId
      )
      .eq(
        "round_id",
        roundId
      ),
  ]);

  if (competitionResult.error) {
    throw competitionResult.error;
  }

  if (roundResult.error) {
    throw roundResult.error;
  }

  if (matchResult.error) {
    throw matchResult.error;
  }

  const competition =
    competitionResult.data;

  const round =
    roundResult.data;

  if (
    !competition ||
    !round
  ) {
    return null;
  }

  const normalizedTeam =
    teamCode.toUpperCase();

  const teamPlaysThisRound =
    (matchResult.data ?? []).some(
      (match) =>
        String(
          match.home_team_code
        ).toUpperCase() ===
          normalizedTeam ||
        String(
          match.away_team_code
        ).toUpperCase() ===
          normalizedTeam
    );

  if (!teamPlaysThisRound) {
    return null;
  }

  const competitionFolder =
    sanitizeDropboxFolderName(
      competition.name
    );

  const roundFolder =
    getRoundFolderName({
      number:
        round.number,
      name:
        round.name,
    });

  const fileName =
    `${normalizedTeam}sht.txt`;

  return `${LINEUPS_FOLDER}/${competitionFolder}/${roundFolder}/${fileName}`;
}
