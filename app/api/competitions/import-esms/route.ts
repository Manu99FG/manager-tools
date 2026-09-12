import {
  NextResponse,
} from "next/server";

import {
  isAdminSession,
} from "@/lib/admin-auth";

import {
  getSupabaseAdmin,
} from "@/lib/supabase-admin";

import {
  parseSttMatch,
  validateSttTeams,
  type SttPlayer,
} from "@/lib/esms-stt";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type DatabasePlayerRow = {
  id: string;
  esms_name: string;
  current_team_code:
    | string
    | null;
};

function normalizePlayerName(
  value: string
) {
  return value
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase(
      "es"
    );
}

function getPlayerMapKey(
  teamCode: string,
  playerName: string
) {
  return `${teamCode.toUpperCase()}::${normalizePlayerName(
    playerName
  )}`;
}

function errorMessage(
  error: unknown
) {
  return error instanceof
    Error
    ? error.message
    : String(
        error
      );
}

async function decodeSttFile(
  file: File
) {
  const buffer =
    await file.arrayBuffer();

  // Los .stt reales del simulador están en codificación
  // Windows-1252 / ANSI, no en UTF-8.
  // Así preservamos nombres como:
  // Gündogan, Suárez, Rúben, Touré...
  return new TextDecoder(
    "windows-1252"
  ).decode(
    buffer
  );
}

export async function POST(
  request: Request
) {
  if (
    !(await isAdminSession())
  ) {
    return NextResponse.json(
      {
        error:
          "No autorizado.",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const formData =
      await request.formData();

    const matchId =
      String(
        formData.get(
          "matchId"
        ) ?? ""
      ).trim();

    const sttFile =
      formData.get(
        "sttFile"
      );

    if (!matchId) {
      return NextResponse.json(
        {
          error:
            "Falta matchId.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !(sttFile instanceof
        File) ||
      sttFile.size ===
        0
    ) {
      return NextResponse.json(
        {
          error:
            "Debes seleccionar un archivo .stt.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      getSupabaseAdmin();

    const {
      data: match,
      error:
        matchError,
    } = await supabase
      .from("matches")
      .select(
        `
          id,
          home_team_code,
          away_team_code
        `
      )
      .eq(
        "id",
        matchId
      )
      .single();

    if (
      matchError ||
      !match
    ) {
      return NextResponse.json(
        {
          error:
            "No se encontró el partido.",
        },
        {
          status: 404,
        }
      );
    }

    const sttText =
      await decodeSttFile(
        sttFile
      );

    const parsed =
      parseSttMatch(
        sttText
      );

    validateSttTeams(
      parsed,
      match.home_team_code,
      match.away_team_code
    );

    const {
      data: dbPlayers,
      error:
        playersError,
    } = await supabase
      .from("players")
      .select(
        `
          id,
          esms_name,
          current_team_code
        `
      )
      .in("current_team_code", [
        match.home_team_code,
        match.away_team_code,
      ]);

    if (
      playersError
    ) {
      throw playersError;
    }

    const playerMap =
      new Map<
        string,
        string
      >();

    for (
      const player of
        (
          dbPlayers ?? []
        ) as DatabasePlayerRow[]
    ) {
      if (
        !player.current_team_code
      ) {
        continue;
      }

      playerMap.set(
        getPlayerMapKey(
          player.current_team_code,
          player.esms_name
        ),
        player.id
      );
    }

    const homeRows =
      parsed.home.players.map(
        (
          player
        ) =>
          toDatabaseRow(
            matchId,
            parsed.home.teamCode,
            player,
            sttFile.name,
            playerMap
          )
      );

    const awayRows =
      parsed.away.players.map(
        (
          player
        ) =>
          toDatabaseRow(
            matchId,
            parsed.away.teamCode,
            player,
            sttFile.name,
            playerMap
          )
      );

    const rows = [
      ...homeRows,
      ...awayRows,
    ];

    // Reimportación idempotente:
    // primero borramos las estadísticas anteriores de ESTE partido
    // y luego insertamos la versión nueva.
    const {
      error:
        deleteError,
    } = await supabase
      .from(
        "match_player_stats"
      )
      .delete()
      .eq(
        "match_id",
        matchId
      );

    if (
      deleteError
    ) {
      throw deleteError;
    }

    const {
      error:
        insertError,
    } = await supabase
      .from(
        "match_player_stats"
      )
      .insert(
        rows
      );

    if (
      insertError
    ) {
      throw insertError;
    }

    const now =
      new Date().toISOString();

    const {
      error:
        updateMatchError,
    } = await supabase
      .from("matches")
      .update({
        home_score:
          parsed.home.goals,
        away_score:
          parsed.away.goals,
        status:
          "PLAYED",
        played_at:
          now,
        esms_source:
          sttFile.name,
        updated_at:
          now,
      })
      .eq(
        "id",
        matchId
      );

    if (
      updateMatchError
    ) {
      throw updateMatchError;
    }

    const unlinked =
      rows.filter(
        (
          row
        ) =>
          row.player_id ===
          null
      );

    const momPlayers =
      rows
        .filter(
          (
            row
          ) =>
            row.mom ===
            1
        )
        .map(
          (
            row
          ) =>
            row.esms_name
        );

    return NextResponse.json({
      ok: true,

      homeTeam:
        parsed.home.teamCode,
      awayTeam:
        parsed.away.teamCode,

      homeScore:
        parsed.home.goals,
      awayScore:
        parsed.away.goals,

      homePlayers:
        homeRows.length,
      awayPlayers:
        awayRows.length,
      playersImported:
        rows.length,

      linkedPlayers:
        rows.length -
        unlinked.length,

      unlinkedPlayers:
        unlinked.map(
          (
            row
          ) => ({
            teamCode:
              row.team_code,
            name:
              row.esms_name,
          })
        ),

      momPlayers,
    });
  } catch (
    error
  ) {
    console.error(
      "Error importando .stt:",
      error
    );

    return NextResponse.json(
      {
        error:
          errorMessage(
            error
          ),
      },
      {
        status: 500,
      }
    );
  }
}

function toDatabaseRow(
  matchId: string,
  teamCode: string,
  player:
    SttPlayer,
  sourceFile: string,
  playerMap:
    Map<
      string,
      string
    >
) {
  const playerId =
    playerMap.get(
      getPlayerMapKey(
        teamCode,
        player.name
      )
    ) ?? null;

  return {
    match_id:
      matchId,
    player_id:
      playerId,

    team_code:
      teamCode,
    esms_name:
      player.name,

    participated:
      player.participated,
    came_on_as_sub:
      player.cameOnAsSub,
    minutes:
      player.minutes,
    mom:
      player.mom,

    saves:
      player.sav,
    conceded:
      player.con,
    tackles:
      player.ktk,
    key_passes:
      player.kps,
    shots:
      player.sht,
    goals:
      player.gls,
    assists:
      player.ass,

    dp:
      player.dp,
    injury:
      player.inj,

    kab_delta:
      player.kabDelta,
    tab_delta:
      player.tabDelta,
    pab_delta:
      player.pabDelta,
    sab_delta:
      player.sabDelta,

    reserved_value:
      player.reservedValue,
    fitness:
      player.fit,

    source_file:
      sourceFile,
    imported_at:
      new Date().toISOString(),
  };
}
