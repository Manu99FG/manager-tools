import { randomInt } from "crypto";
import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function simulatedScore(): [number, number] {
  const home = randomInt(0, 5);
  const away = randomInt(0, 5);
  if (home === 4 && away === 4) return [3, 2];
  return [home, away];
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const body = (await request.json()) as { competitionId?: unknown; overwrite?: unknown };
    const competitionId = typeof body.competitionId === "string" ? body.competitionId.trim() : "";
    const overwrite = body.overwrite === true;
    if (!competitionId) return NextResponse.json({ error: "Falta la competición." }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data: competition, error: competitionError } = await supabase
      .from("competitions")
      .select("id,name,type")
      .eq("id", competitionId)
      .maybeSingle();
    if (competitionError) throw competitionError;
    if (!competition) return NextResponse.json({ error: "La competición no existe." }, { status: 404 });
    if (!String(competition.name).toLocaleLowerCase("es").includes("pretemporada")) {
      return NextResponse.json({ error: "Por seguridad, esta acción solo simula competiciones de pretemporada." }, { status: 409 });
    }

    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select("id,status")
      .eq("competition_id", competitionId);
    if (matchesError) throw matchesError;

    const targetMatches = (matches ?? []).filter((match) => overwrite || match.status !== "PLAYED");
    if (!targetMatches.length) return NextResponse.json({ ok: true, updated: 0 });

    const playedAt = new Date().toISOString();
    for (const match of targetMatches) {
      const [homeScore, awayScore] = simulatedScore();
      const { error: updateError } = await supabase
        .from("matches")
        .update({
          status: "PLAYED",
          home_score: homeScore,
          away_score: awayScore,
          played_at: playedAt,
          esms_source: "SIMULACION_PRETEMPORADA",
        })
        .eq("id", match.id);
      if (updateError) throw updateError;
    }

    return NextResponse.json({ ok: true, updated: targetMatches.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo simular la pretemporada." }, { status: 500 });
  }
}
