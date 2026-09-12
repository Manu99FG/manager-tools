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
      name?: string;
      type?: string;
    };

  const name = body.name?.trim();
  const type = body.type?.trim();

  if (!name || !type) {
    return NextResponse.json(
      {
        error:
          "Nombre y tipo son obligatorios.",
      },
      { status: 400 }
    );
  }

  const allowedTypes = new Set([
    "LEAGUE",
    "CUP",
    "GROUPS",
    "GROUPS_KNOCKOUT",
    "SUPERCUP",
  ]);

  if (!allowedTypes.has(type)) {
    return NextResponse.json(
      { error: "Tipo no válido." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("competition_series")
    .insert({
      name,
      type,
    })
    .select("*")
    .single();

  if (error) {
    if (
      error.message
        .toLowerCase()
        .includes("duplicate")
    ) {
      return NextResponse.json(
        {
          error:
            "Ya existe un histórico con ese nombre.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    series: data,
  });
}
