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
    const date = new Date(scheduledAt);
    if (Number.isNaN(date.getTime())) return NextResponse.json({ error: "Fecha del sorteo no válida." }, { status: 400 });
    const supabase = getSupabaseAdmin();

    const [{ data: destinationCompetition, error: destinationError }, { count: destinationMatchCount, error: destinationMatchesError }] = await Promise.all([
      supabase.from("competitions").select("id,name,type").eq("id", destination).maybeSingle(),
      supabase.from("matches").select("id", { count: "exact", head: true }).eq("competition_id", destination),
    ]);
    if (destinationError) throw destinationError;
    if (destinationMatchesError) throw destinationMatchesError;
    if (!destinationCompetition) return NextResponse.json({ error: "La competición de destino no existe." }, { status: 404 });
    if (String(destinationCompetition.name ?? "").trim().toLocaleLowerCase("es") !== "copa intercontinental") {
      return NextResponse.json({ error: "El destino del sorteo debe ser exactamente la Copa Intercontinental." }, { status: 400 });
    }
    if ((destinationMatchCount ?? 0) > 0) {
      return NextResponse.json({ error: "La Copa Intercontinental ya tiene calendario y no puede recibir un nuevo sorteo." }, { status: 409 });
    }

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
