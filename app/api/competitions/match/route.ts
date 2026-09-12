import {
  NextResponse,
} from "next/server";

import {
  isAdminSession,
} from "@/lib/admin-auth";

import {
  getSupabaseAdmin,
} from "@/lib/supabase-admin";

const VALID_STATUSES =
  new Set([
    "SCHEDULED",
    "PLAYED",
    "POSTPONED",
    "CANCELLED",
  ]);

function parseOptionalScore(
  value: unknown
) {
  if (
    value ===
      null ||
    value ===
      undefined ||
    value ===
      ""
  ) {
    return null;
  }

  const number =
    Number(
      value
    );

  if (
    !Number.isInteger(
      number
    ) ||
    number < 0
  ) {
    throw new Error(
      "Los goles deben ser números enteros positivos o cero."
    );
  }

  return number;
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
    const body =
      (await request.json()) as {
        matchId?: unknown;
        status?: unknown;
        homeScore?: unknown;
        awayScore?: unknown;
        noShowTeamCode?: unknown;
      };

    const matchId =
      typeof body.matchId ===
      "string"
        ? body.matchId.trim()
        : "";

    const status =
      typeof body.status ===
      "string"
        ? body.status
        : "";

    if (
      !matchId ||
      !VALID_STATUSES.has(
        status
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Datos de partido no válidos.",
        },
        {
          status: 400,
        }
      );
    }

    const homeScore =
      parseOptionalScore(
        body.homeScore
      );

    const awayScore =
      parseOptionalScore(
        body.awayScore
      );

    const noShowTeamCode =
      typeof body.noShowTeamCode === "string"
        ? body.noShowTeamCode.trim().toUpperCase()
        : "";

    const supabase =
      getSupabaseAdmin();

    const { data: currentRaw, error: currentError } = await supabase
      .from("matches")
      .select("id,home_team_code,away_team_code")
      .eq("id", matchId)
      .maybeSingle();

    if (currentError) throw currentError;
    const current = currentRaw as {
      id: string;
      home_team_code: string;
      away_team_code: string;
    } | null;

    if (!current) {
      return NextResponse.json(
        { error: "No se encontró el partido." },
        { status: 404 }
      );
    }

    if (
      noShowTeamCode &&
      noShowTeamCode !== current.home_team_code &&
      noShowTeamCode !== current.away_team_code
    ) {
      return NextResponse.json(
        { error: "El equipo marcado como NO PRESENTADO no pertenece al partido." },
        { status: 400 }
      );
    }

    if (
      status === "PLAYED" &&
      !noShowTeamCode &&
      (homeScore === null || awayScore === null)
    ) {
      return NextResponse.json(
        { error: "Un partido jugado necesita marcador local y visitante." },
        { status: 400 }
      );
    }

    // Con NO PRESENTADO se permite guardar el partido sin marcador manual.
    // La base de datos aplica SIEMPRE el resultado administrativo 3-0 / 0-3.
    // Si existe o se importa un .stt, su marcador bruto y sus estadísticas se
    // conservan por separado, pero nunca sustituyen el resultado oficial del NP.
    const playedHomeScore =
      status === "PLAYED"
        ? (homeScore ?? (noShowTeamCode ? 0 : null))
        : null;
    const playedAwayScore =
      status === "PLAYED"
        ? (awayScore ?? (noShowTeamCode ? 0 : null))
        : null;

    const homeNoShow = noShowTeamCode === current.home_team_code;
    const awayNoShow = noShowTeamCode === current.away_team_code;

    const { error } = await supabase
      .from("matches")
      .update({
        status,
        home_score: playedHomeScore,
        away_score: playedAwayScore,
        home_no_show: homeNoShow,
        away_no_show: awayNoShow,
        played_at: status === "PLAYED" ? new Date().toISOString() : null,
      })
      .eq("id", matchId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Error desconocido.",
      },
      {
        status: 500,
      }
    );
  }
}
