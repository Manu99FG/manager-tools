import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AdminNoShowMatch = {
  id: string;
  competition_id?: string;
  round_id: string | null;
  home_team_code: string;
  away_team_code: string;
  home_score: number | null;
  away_score: number | null;
  home_no_show: boolean | null;
  away_no_show: boolean | null;
  stt_home_score: number | null;
  stt_away_score: number | null;
  status: string | null;
  scheduled_at: string | null;
  played_at: string | null;
  created_at?: string | null;
};

type AdminNoShowRound = {
  id: string;
  number: number | null;
  name: string | null;
};

async function requireAdmin() {
  return await isAdminSession();
}

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const competitionId =
    url.searchParams.get("competitionId")?.trim() ?? "";

  if (!competitionId) {
    return NextResponse.json(
      { error: "Falta competitionId." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  const [matchesResult, roundsResult] = await Promise.all([
    supabase
      .from("matches")
      .select(
        [
          "id",
          "competition_id",
          "round_id",
          "home_team_code",
          "away_team_code",
          "home_score",
          "away_score",
          "home_no_show",
          "away_no_show",
          "stt_home_score",
          "stt_away_score",
          "status",
          "scheduled_at",
          "played_at",
          "created_at",
        ].join(",")
      )
      .eq("competition_id", competitionId)
      .order("created_at", { ascending: true }),

    supabase
      .from("competition_rounds")
      .select("id,number,name")
      .eq("competition_id", competitionId)
      .order("number", { ascending: true }),
  ]);

  if (matchesResult.error) {
    return NextResponse.json(
      { error: matchesResult.error.message },
      { status: 500 }
    );
  }

  if (roundsResult.error) {
    return NextResponse.json(
      { error: roundsResult.error.message },
      { status: 500 }
    );
  }

  const rounds =
    (roundsResult.data ?? []) as AdminNoShowRound[];
  const matches =
    ((matchesResult.data ?? []) as unknown) as AdminNoShowMatch[];

  const roundMap = new Map(
    rounds.map((round) => [
      round.id,
      {
        number: round.number,
        name: round.name,
      },
    ])
  );

  return NextResponse.json({
    matches: matches.map((match) => ({
      id: match.id,
      roundId: match.round_id,
      roundNumber: match.round_id
        ? roundMap.get(match.round_id)?.number ?? null
        : null,
      roundName: match.round_id
        ? roundMap.get(match.round_id)?.name ?? null
        : null,
      homeTeamCode: match.home_team_code,
      awayTeamCode: match.away_team_code,
      homeScore: match.home_score,
      awayScore: match.away_score,
      homeNoShow: match.home_no_show,
      awayNoShow: match.away_no_show,
      sttHomeScore: match.stt_home_score,
      sttAwayScore: match.stt_away_score,
      status: match.status,
      scheduledAt: match.scheduled_at,
      playedAt: match.played_at,
    })),
  });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as {
      matchId?: string;
      noShowTeamCode?: string | null;
    };

    const matchId = body.matchId?.trim() ?? "";
    const noShowTeamCode =
      body.noShowTeamCode?.trim().toUpperCase() || null;

    if (!matchId) {
      return NextResponse.json(
        { error: "Falta matchId." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: currentRaw, error: currentError } =
      await supabase
        .from("matches")
        .select(
          "id,home_team_code,away_team_code,home_score,away_score,home_no_show,away_no_show,stt_home_score,stt_away_score,status"
        )
        .eq("id", matchId)
        .maybeSingle();

    if (currentError) throw currentError;

    const current = currentRaw as AdminNoShowMatch | null;

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
        {
          error:
            "El equipo marcado como NO PRESENTADO no pertenece al partido.",
        },
        { status: 400 }
      );
    }

    const homeNoShow =
      noShowTeamCode === current.home_team_code;
    const awayNoShow =
      noShowTeamCode === current.away_team_code;

    const { data: updatedRaw, error: updateError } =
      await supabase
        .from("matches")
        .update({
          home_no_show: homeNoShow,
          away_no_show: awayNoShow,
          updated_at: new Date().toISOString(),
        })
        .eq("id", matchId)
        .select(
          "id,home_team_code,away_team_code,home_score,away_score,home_no_show,away_no_show,stt_home_score,stt_away_score,status"
        )
        .single();

    if (updateError) throw updateError;

    const updated = updatedRaw as AdminNoShowMatch;

    return NextResponse.json({
      ok: true,
      match: {
        id: updated.id,
        homeTeamCode: updated.home_team_code,
        awayTeamCode: updated.away_team_code,
        homeScore: updated.home_score,
        awayScore: updated.away_score,
        homeNoShow: updated.home_no_show,
        awayNoShow: updated.away_no_show,
        sttHomeScore: updated.stt_home_score,
        sttAwayScore: updated.stt_away_score,
        status: updated.status,
      },
    });
  } catch (error) {
    console.error(
      "Error guardando NO PRESENTADO:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo guardar el NO PRESENTADO.",
      },
      { status: 500 }
    );
  }
}

