import { NextResponse } from "next/server";

import { getDropboxClient, getDropboxRosterPath } from "@/lib/dropbox";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

import {
  parseOriginalRoster,
  validateOriginalTeamsheet,
} from "@/lib/original-sht-checker";

export const runtime = "nodejs";

const LINEUPS_FOLDER =
  "/ESO - Evolution Soccer Online/Alineaciones";

const MAX_FILE_SIZE =
  256 * 1024;

const LEAGUE_RULES = {
  Max_Skill: 30,
  Min_DF: 2,
  Max_DF: 8,
  Min_MF: 2,
  Max_MF: 8,
  Max_DM: 8,
  Max_AM: 8,
  Min_FW: 0,
  Max_FW: 5,
};

function sanitizeDropboxFolderName(
  value: string
) {
  return value
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeWindows1252(
  bytes: ArrayBuffer
) {
  return new TextDecoder(
    "windows-1252"
  ).decode(bytes);
}

type RoundRow = {
  id: string;
  number: number;
  name: string | null;
};

type MatchRow = {
  id: string;
  round_id: string | null;
  home_team_code: string;
  away_team_code: string;
  status: string;
};

function findNextRoundForTeam({
  rounds,
  matches,
  teamCode,
}: {
  rounds: RoundRow[];
  matches: MatchRow[];
  teamCode: string;
}) {
  const matchesByRound =
    new Map<
      string,
      MatchRow[]
    >();

  for (const match of matches) {
    if (!match.round_id) {
      continue;
    }

    const current =
      matchesByRound.get(
        match.round_id
      ) ?? [];

    current.push(match);

    matchesByRound.set(
      match.round_id,
      current
    );
  }

  for (
    const round of
      [...rounds].sort(
        (a, b) =>
          a.number -
          b.number
      )
  ) {
    const roundMatches =
      matchesByRound.get(
        round.id
      ) ?? [];

    const teamMatch =
      roundMatches.find(
        (match) => {
          const home =
            String(
              match.home_team_code
            ).toUpperCase();

          const away =
            String(
              match.away_team_code
            ).toUpperCase();

          return (
            home ===
              teamCode ||
            away ===
              teamCode
          );
        }
      );

    if (!teamMatch) {
      continue;
    }

    if (
      String(
        teamMatch.status
      ).toUpperCase() ===
      "PLAYED"
    ) {
      continue;
    }

    return {
      round,
      match:
        teamMatch,
    };
  }

  return null;
}

export async function POST(
  request: Request
) {
  try {
    const formData =
      await request.formData();

    const competitionId =
      String(
        formData.get(
          "competitionId"
        ) ?? ""
      ).trim();

    const teamCode =
      String(
        formData.get(
          "teamCode"
        ) ?? ""
      )
        .trim()
        .toUpperCase();

    const uploadedFile =
      formData.get(
        "file"
      );

    if (
      !competitionId ||
      !teamCode
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Faltan la competición o el equipo.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !(uploadedFile instanceof File)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se ha recibido el archivo de alineación.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      uploadedFile.size >
      MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El archivo es demasiado grande.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !uploadedFile.name
        .toLowerCase()
        .endsWith(".txt")
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La alineación debe ser un archivo .txt.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      getSupabaseAdmin();

    const [
      competitionResult,
      teamResult,
      roundsResult,
      matchesResult,
    ] = await Promise.all([
      supabase
        .from("competitions")
        .select(
          "id, name, slug, status"
        )
        .eq(
          "id",
          competitionId
        )
        .maybeSingle(),

      supabase
        .from(
          "competition_teams"
        )
        .select(
          "competition_id, team_code"
        )
        .eq(
          "competition_id",
          competitionId
        )
        .eq(
          "team_code",
          teamCode
        )
        .maybeSingle(),

      supabase
        .from(
          "competition_rounds"
        )
        .select(
          "id, number, name"
        )
        .eq(
          "competition_id",
          competitionId
        )
        .order(
          "number",
          {
            ascending: true,
          }
        ),

      supabase
        .from("matches")
        .select(
          "id, round_id, home_team_code, away_team_code, status"
        )
        .eq(
          "competition_id",
          competitionId
        ),
    ]);

    if (
      competitionResult.error
    ) {
      throw competitionResult.error;
    }

    if (teamResult.error) {
      throw teamResult.error;
    }

    if (roundsResult.error) {
      throw roundsResult.error;
    }

    if (matchesResult.error) {
      throw matchesResult.error;
    }

    const competition =
      competitionResult.data;

    if (!competition) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La competición no existe.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      competition.status !==
      "ACTIVE"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Esta competición no está abierta para el envío de alineaciones.",
        },
        {
          status: 400,
        }
      );
    }

    if (!teamResult.data) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `${teamCode} no participa en ${competition.name}.`,
        },
        {
          status: 400,
        }
      );
    }

    const next =
      findNextRoundForTeam({
        rounds:
          (roundsResult.data ??
            []) as RoundRow[],

        matches:
          (matchesResult.data ??
            []) as MatchRow[],

        teamCode,
      });

    if (!next) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `${teamCode} no tiene ninguna jornada pendiente en ${competition.name}.`,
        },
        {
          status: 400,
        }
      );
    }

    const fileBuffer =
      await uploadedFile.arrayBuffer();

    const teamsheetText =
      decodeWindows1252(
        fileBuffer
      );

    const significant =
      teamsheetText
        .split(/\r?\n/)
        .map(
          (line) =>
            line.trim()
        )
        .filter(Boolean);

    const sheetTeamCode =
      significant[0]
        ?.toUpperCase() ??
      "";

    if (
      sheetTeamCode !==
      teamCode
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `La alineación pertenece a ${sheetTeamCode || "un equipo desconocido"}, pero has seleccionado ${teamCode}.`,
        },
        {
          status: 400,
        }
      );
    }

    const dropbox =
      await getDropboxClient();

    const rosterPath =
      await getDropboxRosterPath(teamCode, "live");

    const rosterDownload =
      await dropbox.filesDownload({
        path: rosterPath,
      });

    const rosterBlob =
      rosterDownload.result.fileBlob;

    if (!rosterBlob) {
      throw new Error(
        `No se pudo descargar la plantilla ${teamCode} desde Dropbox.`
      );
    }

    const rosterBytes =
      await rosterBlob.arrayBuffer();

    const rosterText =
      decodeWindows1252(
        rosterBytes
      );

    const roster =
      parseOriginalRoster(
        rosterText
      );

    const checkerResult =
      validateOriginalTeamsheet({
        teamsheetText,
        roster,
        league:
          LEAGUE_RULES,
      });

    if (
      !checkerResult.valid
    ) {
      const lineText =
        checkerResult.error.line !==
        null
          ? ` Línea ${checkerResult.error.line}.`
          : "";

      return NextResponse.json(
        {
          ok: false,
          error:
            `${checkerResult.error.message}${lineText}`,
        },
        {
          status: 400,
        }
      );
    }

    if (
      checkerResult.teamsheet.team !==
      teamCode
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `El checker ha detectado el equipo ${checkerResult.teamsheet.team}, no ${teamCode}.`,
        },
        {
          status: 400,
        }
      );
    }

    const competitionFolder =
      sanitizeDropboxFolderName(
        competition.name
      );

    const roundDisplayName =
      next.round.name?.trim() ||
      `Jornada ${next.round.number}`;

    const roundFolder =
      sanitizeDropboxFolderName(
        roundDisplayName
      );

    const fileName =
      `${teamCode}sht.txt`;

    const dropboxPath =
      `${LINEUPS_FOLDER}/${competitionFolder}/${roundFolder}/${fileName}`;

    await dropbox.filesUpload({
      path:
        dropboxPath,

      contents:
        Buffer.from(
          fileBuffer
        ),

      mode: {
        ".tag":
          "overwrite",
      },

      autorename:
        false,

      mute:
        true,
    });

    return NextResponse.json({
      ok: true,

      fileName,

      dropboxPath,

      roundId:
        next.round.id,

      roundNumber:
        next.round.number,

      roundName:
        roundDisplayName,

      matchId:
        next.match.id,

      message:
        `✅ ${fileName} enviada correctamente para ${roundDisplayName} de ${competition.name}.`,
    });
  } catch (error) {
    console.error(
      "Error enviando alineación:",
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "No se pudo enviar la alineación.",
      },
      {
        status: 500,
      }
    );
  }
}
