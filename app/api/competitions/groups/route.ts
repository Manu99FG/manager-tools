import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { CLUB_CLASSES, validateClassDistribution } from "@/lib/club-classes";

type AssignmentInput = {
  teamCode?: unknown;
  groupName?: unknown;
};

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      competitionId?: unknown;
      assignments?: unknown;
    };

    const competitionId = typeof body.competitionId === "string" ? body.competitionId.trim() : "";
    if (!competitionId) {
      return NextResponse.json({ error: "Falta la competición." }, { status: 400 });
    }

    if (!Array.isArray(body.assignments)) {
      return NextResponse.json({ error: "Faltan las asignaciones de grupos." }, { status: 400 });
    }

    const assignments = (body.assignments as AssignmentInput[]).map((item) => ({
      teamCode: typeof item.teamCode === "string" ? item.teamCode.trim().toUpperCase() : "",
      groupName: typeof item.groupName === "string" ? item.groupName.trim() : "",
    }));

    const supabase = getSupabaseAdmin();

    const [{ data: competition, error: competitionError }, { count: matchCount, error: matchError }, { data: currentTeams, error: teamsError }] = await Promise.all([
      supabase.from("competitions").select("id,name,type").eq("id", competitionId).maybeSingle(),
      supabase.from("matches").select("id", { count: "exact", head: true }).eq("competition_id", competitionId),
      supabase.from("competition_teams").select("team_code").eq("competition_id", competitionId),
    ]);

    if (competitionError) throw competitionError;
    if (matchError) throw matchError;
    if (teamsError) throw teamsError;
    if (!competition) {
      return NextResponse.json({ error: "La competición no existe." }, { status: 404 });
    }
    if (!["GROUPS", "GROUPS_KNOCKOUT"].includes(String(competition.type))) {
      return NextResponse.json({ error: "Esta competición no utiliza fase de grupos." }, { status: 409 });
    }
    if ((matchCount ?? 0) > 0) {
      return NextResponse.json(
        { error: "No se pueden cambiar los grupos después de generar el calendario." },
        { status: 409 }
      );
    }

    const currentCodes = new Set((currentTeams ?? []).map((item) => String(item.team_code).trim().toUpperCase()));

    if (String(competition.name ?? "").trim().toLocaleLowerCase("es") === "copa de leyendas") {
      const codes = [...currentCodes];
      const { data: metadata, error: metadataError } = await supabase
        .from("club_metadata")
        .select("team_code,club_class")
        .in("team_code", codes);
      if (metadataError) throw metadataError;
      const classByCode = new Map((metadata ?? []).map((row) => [String(row.team_code).trim().toUpperCase(), typeof row.club_class === "string" ? row.club_class : null]));
      const validation = validateClassDistribution(codes.map((teamCode) => ({ teamCode, clubClass: classByCode.get(teamCode) ?? null })), 4);
      if (validation.missing.length) return NextResponse.json({ error: `Falta asignar clase a: ${validation.missing.join(", ")}.` }, { status: 400 });
      if (validation.invalid.length) return NextResponse.json({ error: "Hay clases no válidas. Usa Clase A-H." }, { status: 400 });
      if (validation.wrongSizes.length) return NextResponse.json({ error: `Cada clase debe tener 4 equipos. Revisa: ${validation.wrongSizes.map((item) => `${item.clubClass} (${item.teams.length})`).join(", ")}.` }, { status: 400 });

      for (const clubClass of CLUB_CLASSES) {
        for (const teamCode of validation.byClass.get(clubClass) ?? []) {
          const { error: updateError } = await supabase
            .from("competition_teams")
            .update({ group_name: clubClass })
            .eq("competition_id", competitionId)
            .eq("team_code", teamCode);
          if (updateError) throw updateError;
        }
      }
      return NextResponse.json({ ok: true, syncedFromClasses: true });
    }

    if (!assignments.length || assignments.some((item) => !item.teamCode || !item.groupName)) {
      return NextResponse.json({ error: "Todos los equipos deben tener un grupo válido." }, { status: 400 });
    }
    const uniqueCodes = new Set(assignments.map((item) => item.teamCode));
    if (uniqueCodes.size !== assignments.length) {
      return NextResponse.json({ error: "Hay equipos duplicados en la asignación." }, { status: 400 });
    }

    if (currentCodes.size !== assignments.length || assignments.some((item) => !currentCodes.has(item.teamCode))) {
      return NextResponse.json(
        { error: "La asignación debe incluir exactamente todos los equipos participantes." },
        { status: 400 }
      );
    }

    for (const assignment of assignments) {
      const { error: updateError } = await supabase
        .from("competition_teams")
        .update({ group_name: assignment.groupName })
        .eq("competition_id", competitionId)
        .eq("team_code", assignment.teamCode);
      if (updateError) throw updateError;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido." },
      { status: 500 }
    );
  }
}
