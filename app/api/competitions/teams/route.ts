import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      competitionId?: unknown;
      teams?: unknown;
    };

    const competitionId =
      typeof body.competitionId === "string" ? body.competitionId.trim() : "";

    const teams = Array.isArray(body.teams)
      ? Array.from(
          new Set(
            body.teams
              .filter((item) => typeof item === "string")
              .map((item) => String(item).trim().toUpperCase())
              .filter(Boolean)
          )
        )
      : [];

    if (!competitionId) {
      return NextResponse.json({ error: "Falta la competición." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { count, error: matchCountError } = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("competition_id", competitionId);

    if (matchCountError) throw matchCountError;

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: "No puedes reemplazar participantes después de generar el calendario." },
        { status: 409 }
      );
    }

    const { error: deleteError } = await supabase
      .from("competition_teams")
      .delete()
      .eq("competition_id", competitionId);

    if (deleteError) throw deleteError;

    if (teams.length > 0) {
      const { error: insertError } = await supabase.from("competition_teams").insert(
        teams.map((team, index) => ({
          competition_id: competitionId,
          team_code: team,
          seed: index + 1,
        }))
      );

      if (insertError) throw insertError;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido." },
      { status: 500 }
    );
  }
}
