import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      matchId?: unknown;
      homeScore?: unknown;
      awayScore?: unknown;
    };

    const matchId = typeof body.matchId === "string" ? body.matchId.trim() : "";
    const homeScore = Number(body.homeScore);
    const awayScore = Number(body.awayScore);

    if (
      !matchId ||
      !Number.isInteger(homeScore) ||
      homeScore < 0 ||
      !Number.isInteger(awayScore) ||
      awayScore < 0
    ) {
      return NextResponse.json({ error: "Resultado no válido." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("matches")
      .update({
        home_score: homeScore,
        away_score: awayScore,
        status: "PLAYED",
        played_at: new Date().toISOString(),
      })
      .eq("id", matchId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido." },
      { status: 500 }
    );
  }
}
