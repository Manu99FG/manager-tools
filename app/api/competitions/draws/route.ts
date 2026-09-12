import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const body = (await request.json()) as { name?: unknown; sourceCompetitionId?: unknown; destinationCompetitionId?: unknown; scheduledAt?: unknown; revealIntervalSeconds?: unknown };
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Sorteo Copa Intercontinental";
    const source = typeof body.sourceCompetitionId === "string" ? body.sourceCompetitionId.trim() : "";
    const destination = typeof body.destinationCompetitionId === "string" ? body.destinationCompetitionId.trim() : "";
    const scheduledAt = typeof body.scheduledAt === "string" ? body.scheduledAt.trim() : "";
    const revealIntervalSeconds = Math.max(2, Math.min(60, Number(body.revealIntervalSeconds ?? 8) || 8));
    if (!source || !destination || !scheduledAt) return NextResponse.json({ error: "Faltan datos del sorteo." }, { status: 400 });
    if (source === destination) return NextResponse.json({ error: "La competición de origen y la Copa Intercontinental no pueden ser la misma." }, { status: 400 });
    const date = new Date(scheduledAt);
    if (Number.isNaN(date.getTime())) return NextResponse.json({ error: "Fecha del sorteo no válida." }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const [{ data: sourceCompetition, error: sourceError }, { data: destinationCompetition, error: destinationError }, { count: destinationMatches, error: matchesError }] = await Promise.all([
      supabase.from("competitions").select("id,season_id,name").eq("id", source).maybeSingle(),
      supabase.from("competitions").select("id,season_id,name,type").eq("id", destination).maybeSingle(),
      supabase.from("matches").select("id", { count: "exact", head: true }).eq("competition_id", destination),
    ]);
    if (sourceError) throw sourceError;
    if (destinationError) throw destinationError;
    if (matchesError) throw matchesError;
    if (!sourceCompetition || !destinationCompetition) return NextResponse.json({ error: "No se encontró la competición de origen o destino." }, { status: 404 });
    if (String(sourceCompetition.season_id) !== String(destinationCompetition.season_id)) return NextResponse.json({ error: "El origen y la Copa Intercontinental deben pertenecer a la misma temporada." }, { status: 400 });
    if (!String(destinationCompetition.name ?? "").toLocaleLowerCase("es").includes("intercontinental")) return NextResponse.json({ error: "El destino debe ser la Copa Intercontinental." }, { status: 400 });
    if ((destinationMatches ?? 0) > 0) return NextResponse.json({ error: "La Copa Intercontinental ya tiene calendario o partidos. Bórralos antes de programar un nuevo sorteo." }, { status: 409 });

    // La Copa Intercontinental debe permanecer sin equipos hasta que se celebre el sorteo.
    // Esto limpia también las asignaciones antiguas creadas por versiones previas del formato oficial.
    const { error: clearError } = await supabase.from("competition_teams").delete().eq("competition_id", destination);
    if (clearError) throw clearError;

    const { data, error } = await supabase.from("competition_draws").insert({
      name,
      source_competition_id: source,
      destination_competition_id: destination,
      scheduled_at: date.toISOString(),
      reveal_interval_seconds: revealIntervalSeconds,
      status: "SCHEDULED",
    }).select("id").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, id: data.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo crear el sorteo." }, { status: 500 });
  }
}
