import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function POST(
  request: Request
) {
  const isAdmin = await isAdminSession();

  if (!isAdmin) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401 }
    );
  }

  const body =
    (await request.json()) as {
      competitionId?: string;
      seriesId?: string | null;
    };

  const competitionId =
    body.competitionId?.trim();

  if (!competitionId) {
    return NextResponse.json(
      {
        error:
          "Falta competitionId.",
      },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  if (body.seriesId) {
    const { data: series, error: seriesError } = await supabase
      .from("competition_series")
      .select("id")
      .eq("id", body.seriesId)
      .maybeSingle();

    if (seriesError) {
      return NextResponse.json(
        { error: seriesError.message },
        { status: 500 }
      );
    }

    if (!series) {
      return NextResponse.json(
        { error: "Histórico no encontrado." },
        { status: 404 }
      );
    }
  }

  const { error } = await supabase
    .from("competitions")
    .update({
      series_id:
        body.seriesId ?? null,
    })
    .eq("id", competitionId);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
  });
}
