import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { normalizeClubClass } from "@/lib/club-classes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { teamCode?: unknown; clubClass?: unknown };
    const teamCode = typeof body.teamCode === "string" ? body.teamCode.trim().toUpperCase() : "";
    const clubClassRaw = typeof body.clubClass === "string" ? body.clubClass.trim() : "";
    const clubClass = clubClassRaw ? normalizeClubClass(clubClassRaw) : null;

    if (!teamCode) {
      return NextResponse.json({ error: "Falta el código del club." }, { status: 400 });
    }
    if (teamCode.length > 12) {
      return NextResponse.json({ error: "Código de club no válido." }, { status: 400 });
    }
    if (clubClassRaw && !clubClass) {
      return NextResponse.json({ error: "Clase no válida. Usa Clase A, B, C, D, E, F, G o H." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("club_metadata")
      .upsert(
        {
          team_code: teamCode,
          club_class: clubClass,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "team_code" }
      )
      .select("team_code,club_class,updated_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, club: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo actualizar la clase del club." },
      { status: 500 }
    );
  }
}
