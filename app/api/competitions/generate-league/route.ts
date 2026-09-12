import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { generateLeagueCalendar } from "@/lib/league-calendar";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { competitionId?: unknown };
    const competitionId =
      typeof body.competitionId === "string" ? body.competitionId.trim() : "";

    if (!competitionId) {
      return NextResponse.json({ error: "Falta competitionId." }, { status: 400 });
    }

    const result = await generateLeagueCalendar(getSupabaseAdmin(), competitionId);

    if (!result.generated) {
      if (result.reason === "NOT_LEAGUE") {
        return NextResponse.json(
          { error: "La generación automática solo está disponible para ligas." },
          { status: 400 }
        );
      }
      if (result.reason === "NOT_ENOUGH_TEAMS") {
        return NextResponse.json(
          { error: "La liga necesita al menos 2 equipos." },
          { status: 400 }
        );
      }
      if (result.reason === "ALREADY_GENERATED") {
        return NextResponse.json(
          { error: "Esta competición ya tiene partidos generados." },
          { status: 409 }
        );
      }
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido." },
      { status: 500 }
    );
  }
}
