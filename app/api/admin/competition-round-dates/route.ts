import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const validDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
    }
    const { competitionId, roundId, startsAt, endsAt } = body as Record<string, unknown>;
    if (typeof competitionId !== "string" || !/^[0-9a-f-]{36}$/i.test(competitionId) ||
        typeof roundId !== "string" || !/^[0-9a-f-]{36}$/i.test(roundId) ||
        !(startsAt === null || validDate(startsAt)) ||
        !(endsAt === null || validDate(endsAt))) {
      return NextResponse.json({ error: "Identificadores o fechas inválidos." }, { status: 400 });
    }
    if (startsAt && endsAt && startsAt > endsAt) {
      return NextResponse.json({ error: "La fecha inicial supera la final." }, { status: 400 });
    }
    const db = getSupabaseAdmin();
    const { data, error } = await db.from("competition_rounds")
      .update({ starts_at: startsAt, ends_at: endsAt })
      .eq("id", roundId).eq("competition_id", competitionId)
      .select("id,starts_at,ends_at").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Ronda no encontrada." }, { status: 404 });
    return NextResponse.json({ ok: true, round: data });
  } catch (error) {
    console.error("Error al actualizar fechas de ronda", error);
    return NextResponse.json({ error: "No se pudieron guardar las fechas." }, { status: 500 });
  }
}
