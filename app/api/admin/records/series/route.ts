import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const VALID_SCOPES = new Set([
  "DOMESTIC_LEAGUE",
  "DOMESTIC_CUP",
  "CONTINENTAL",
  "SUPERCUP",
  "OTHER",
]);

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!body?.id || typeof body.id !== "string") {
      return NextResponse.json({ error: "Falta la competiciÃ³n histÃ³rica." }, { status: 400 });
    }

    const scope = VALID_SCOPES.has(body.scope) ? body.scope : "OTHER";
    const leagueLevel =
      body.league_level === null || body.league_level === ""
        ? null
        : Math.max(1, Number(body.league_level));

    const promotedPlaces = Math.max(0, Number(body.promoted_places ?? 0));

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("competition_series")
      .update({
        scope,
        league_level: Number.isFinite(leagueLevel) ? leagueLevel : null,
        counts_as_league: Boolean(body.counts_as_league),
        counts_as_champions: Boolean(body.counts_as_champions),
        tracks_promotions: Boolean(body.tracks_promotions),
        promoted_places: Number.isFinite(promotedPlaces) ? promotedPlaces : 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id)
      .select(
        "id,name,type,scope,league_level,counts_as_league,counts_as_champions,tracks_promotions,promoted_places"
      )
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, series: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo guardar." },
      { status: 500 }
    );
  }
}

