import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const VALID_STAGES = new Set([
  "",
  "FINAL",
  "SEMIFINAL",
  "QUARTERFINAL",
  "ROUND_OF_16",
  "GROUP",
  "LEAGUE",
  "OTHER",
]);

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!body?.id || typeof body.id !== "string") {
      return NextResponse.json({ error: "Falta la jornada." }, { status: 400 });
    }

    const rawStage = typeof body.stage === "string" ? body.stage.toUpperCase() : "";
    if (!VALID_STAGES.has(rawStage)) {
      return NextResponse.json({ error: "Fase no vÃ¡lida." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("competition_rounds")
      .update({
        stage: rawStage || null,
      })
      .eq("id", body.id)
      .select("id,competition_id,number,name,stage")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, round: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo guardar." },
      { status: 500 }
    );
  }
}

