import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ZoneInput = {
  label?: string;
  startPosition?: number;
  endPosition?: number;
  color?: string;
  sortOrder?: number;
};

async function requireAdmin() {
  return await isAdminSession();
}

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const url = new URL(request.url);
  const competitionId = url.searchParams.get("competitionId")?.trim() ?? "";

  if (!competitionId) {
    return NextResponse.json(
      { error: "Falta competitionId." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("competition_standing_zones")
    .select(
      "id,competition_id,label,start_position,end_position,color,sort_order"
    )
    .eq("competition_id", competitionId)
    .order("sort_order", { ascending: true })
    .order("start_position", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    zones: (data ?? []).map((row) => ({
      id: row.id,
      competitionId: row.competition_id,
      label: row.label,
      startPosition: row.start_position,
      endPosition: row.end_position,
      color: row.color,
      sortOrder: row.sort_order,
    })),
  });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      competitionId?: string;
      zones?: ZoneInput[];
    };

    const competitionId = body.competitionId?.trim() ?? "";
    const zones = Array.isArray(body.zones) ? body.zones : [];

    if (!competitionId) {
      return NextResponse.json(
        { error: "Falta competitionId." },
        { status: 400 }
      );
    }

    const normalized = zones.map((zone, index) => ({
      label: String(zone.label ?? "").trim(),
      start_position: Number(zone.startPosition),
      end_position: Number(zone.endPosition),
      color: String(zone.color ?? "").trim().toUpperCase(),
      sort_order: Number.isFinite(Number(zone.sortOrder))
        ? Number(zone.sortOrder)
        : index,
    }));

    for (const zone of normalized) {
      if (!zone.label) {
        return NextResponse.json(
          { error: "Todas las zonas necesitan un nombre." },
          { status: 400 }
        );
      }

      if (
        !Number.isInteger(zone.start_position) ||
        !Number.isInteger(zone.end_position) ||
        zone.start_position < 1 ||
        zone.end_position < zone.start_position
      ) {
        return NextResponse.json(
          { error: `Rango inválido en "${zone.label}".` },
          { status: 400 }
        );
      }

      if (!/^#[0-9A-F]{6}$/.test(zone.color)) {
        return NextResponse.json(
          { error: `Color inválido en "${zone.label}". Usa formato #RRGGBB.` },
          { status: 400 }
        );
      }
    }

    const ordered = [...normalized].sort(
      (a, b) => a.start_position - b.start_position
    );

    for (let i = 1; i < ordered.length; i += 1) {
      if (ordered[i].start_position <= ordered[i - 1].end_position) {
        return NextResponse.json(
          {
            error: `Las zonas "${ordered[i - 1].label}" y "${ordered[i].label}" se solapan.`,
          },
          { status: 400 }
        );
      }
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.rpc("replace_competition_standing_zones", {
      p_competition_id: competitionId,
      p_zones: normalized,
    });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error guardando zonas de clasificación:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudieron guardar las zonas.",
      },
      { status: 500 }
    );
  }
}
