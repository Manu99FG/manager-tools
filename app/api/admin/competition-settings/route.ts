import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type {
  CompetitionStatus,
  StandingTiebreaker,
} from "@/lib/competition-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_STATUSES = new Set<CompetitionStatus>([
  "DRAFT",
  "ACTIVE",
  "FINISHED",
]);

const FIXED_TIEBREAKERS = [
  "FEWER_NO_SHOWS",
  "HEAD_TO_HEAD_POINTS",
  "GOAL_DIFFERENCE",
  "GOALS_FOR",
] satisfies StandingTiebreaker[];

function integerBetween(
  value: unknown,
  min: number,
  max: number,
  label: string
) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${label}: valor no válido.`);
  }

  return parsed;
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as {
      competitionId?: unknown;
      status?: unknown;
      pointsWin?: unknown;
      pointsDraw?: unknown;
      pointsLoss?: unknown;
      homeAndAway?: unknown;
      tiebreakers?: unknown;
    };

    const competitionId =
      typeof body.competitionId === "string"
        ? body.competitionId.trim()
        : "";

    const status =
      typeof body.status === "string"
        ? (body.status as CompetitionStatus)
        : null;

    if (!competitionId || !status || !VALID_STATUSES.has(status)) {
      return NextResponse.json(
        { error: "Configuración no válida." },
        { status: 400 }
      );
    }

    const pointsWin = integerBetween(
      body.pointsWin,
      -20,
      20,
      "Puntos por victoria"
    );

    const pointsDraw = integerBetween(
      body.pointsDraw,
      -20,
      20,
      "Puntos por empate"
    );

    const pointsLoss = integerBetween(
      body.pointsLoss,
      -20,
      20,
      "Puntos por derrota"
    );

    // El reglamento de clasificación es global y no configurable.
    const tiebreakers = FIXED_TIEBREAKERS;

    const supabase = getSupabaseAdmin();

    const { data: current, error: currentError } =
      await supabase
        .from("competitions")
        .select("id,home_and_away")
        .eq("id", competitionId)
        .maybeSingle();

    if (currentError) throw currentError;

    if (!current) {
      return NextResponse.json(
        { error: "No se encontró la competición." },
        { status: 404 }
      );
    }

    const homeAndAway = body.homeAndAway === true;

    if (homeAndAway !== current.home_and_away) {
      const { count, error: countError } = await supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("competition_id", competitionId);

      if (countError) throw countError;

      if ((count ?? 0) > 0) {
        return NextResponse.json(
          {
            error:
              "No puedes cambiar Ida y vuelta después de generar el calendario.",
          },
          { status: 409 }
        );
      }
    }

    const { error: updateError } = await supabase
      .from("competitions")
      .update({
        status,
        points_win: pointsWin,
        points_draw: pointsDraw,
        points_loss: pointsLoss,
        home_and_away: homeAndAway,
        standings_tiebreakers: tiebreakers,
      })
      .eq("id", competitionId);

    if (updateError) throw updateError;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la configuración.",
      },
      { status: 500 }
    );
  }
}
