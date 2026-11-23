import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const body = await request.json() as { competitionId?: unknown; status?: unknown };
    if (typeof body.competitionId !== "string" || !body.competitionId.trim() ||
        !["DRAFT", "ACTIVE", "FINISHED"].includes(String(body.status))) {
      return NextResponse.json({ error: "Competición o estado no válido." }, { status: 400 });
    }
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("competitions")
      .update({ status: body.status })
      .eq("id", body.competitionId.trim())
      .select("id,status").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "No se encontró la competición." }, { status: 404 });
    return NextResponse.json({ ok: true, competition: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo actualizar el estado." }, { status: 500 });
  }
}
