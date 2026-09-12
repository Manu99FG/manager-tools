import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const TYPES = new Set(["LEAGUE", "CUP", "GROUPS", "GROUPS_KNOCKOUT", "SUPERCUP"]);

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getOrCreateSeriesId(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  name: string,
  type: string
) {
  const cleanName = name.trim();

  const { data: existing, error: findError } = await supabase
    .from("competition_series")
    .select("id")
    .ilike("name", cleanName)
    .limit(1)
    .maybeSingle();

  if (findError) throw findError;
  if (existing?.id) return existing.id as string;

  const { data: created, error: createError } = await supabase
    .from("competition_series")
    .insert({ name: cleanName, type })
    .select("id")
    .single();

  if (!createError && created?.id) return created.id as string;

  // Si dos peticiones crean la misma serie a la vez, el índice único puede
  // hacer fallar una de ellas. En ese caso recuperamos la serie ya creada.
  const { data: afterConflict, error: conflictError } = await supabase
    .from("competition_series")
    .select("id")
    .ilike("name", cleanName)
    .limit(1)
    .maybeSingle();

  if (conflictError) throw conflictError;
  if (afterConflict?.id) return afterConflict.id as string;

  throw createError ?? new Error("No se pudo crear el histórico de la competición.");
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      seasonId?: unknown;
      name?: unknown;
      type?: unknown;
      homeAndAway?: unknown;
      teams?: unknown;
    };

    const seasonId = typeof body.seasonId === "string" ? body.seasonId.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const type = typeof body.type === "string" ? body.type : "";
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

    if (!seasonId || !name || !TYPES.has(type)) {
      return NextResponse.json({ error: "Datos de competición no válidos." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const seriesId = await getOrCreateSeriesId(supabase, name, type);

    const { data: competition, error } = await supabase
      .from("competitions")
      .insert({
        season_id: seasonId,
        name,
        slug: slugify(name),
        type,
        series_id: seriesId,
        home_and_away: body.homeAndAway === true,
        status: "DRAFT",
      })
      .select("id")
      .single();

    if (error) throw error;

    if (teams.length > 0) {
      const { error: teamsError } = await supabase.from("competition_teams").insert(
        teams.map((team, index) => ({
          competition_id: competition.id,
          team_code: team,
          seed: index + 1,
        }))
      );

      if (teamsError) {
        // Evitamos dejar una competición vacía si falla la inscripción inicial.
        await supabase.from("competitions").delete().eq("id", competition.id);
        throw teamsError;
      }
    }

    return NextResponse.json({ ok: true, competitionId: competition.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
    if (!id) {
      return NextResponse.json({ error: "Falta el identificador de la competición." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("competitions").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido." },
      { status: 500 }
    );
  }
}
