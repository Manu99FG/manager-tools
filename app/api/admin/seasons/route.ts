import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cleanNullableDate(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

function validateDateRange(
  startsAt: string | null,
  endsAt: string | null
) {
  if (
    startsAt &&
    endsAt &&
    new Date(startsAt).getTime() >
      new Date(endsAt).getTime()
  ) {
    return "La fecha de inicio no puede ser posterior a la fecha de fin.";
  }

  return null;
}

async function requireAdmin() {
  return await isAdminSession();
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as {
      name?: unknown;
      startsAt?: unknown;
      endsAt?: unknown;
      isActive?: unknown;
    };

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    if (!name) {
      return NextResponse.json(
        {
          error:
            "El nombre de la temporada es obligatorio.",
        },
        { status: 400 }
      );
    }

    const startsAt = cleanNullableDate(body.startsAt);
    const endsAt = cleanNullableDate(body.endsAt);

    const rangeError = validateDateRange(
      startsAt,
      endsAt
    );

    if (rangeError) {
      return NextResponse.json(
        { error: rangeError },
        { status: 400 }
      );
    }

    const isActive = body.isActive === true;

    const supabase = getSupabaseAdmin();

    if (isActive) {
      const { error: deactivateError } =
        await supabase
          .from("seasons")
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq("is_active", true);

      if (deactivateError) throw deactivateError;
    }

    const { data, error } = await supabase
      .from("seasons")
      .insert({
        name,
        starts_at: startsAt,
        ends_at: endsAt,
        is_active: isActive,
      })
      .select(
        "id,name,starts_at,ends_at,is_active,created_at,updated_at"
      )
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      season: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear la temporada.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as {
      id?: unknown;
      name?: unknown;
      startsAt?: unknown;
      endsAt?: unknown;
      isActive?: unknown;
    };

    const id =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    if (!id) {
      return NextResponse.json(
        { error: "Falta el ID de la temporada." },
        { status: 400 }
      );
    }

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    if (!name) {
      return NextResponse.json(
        {
          error:
            "El nombre de la temporada es obligatorio.",
        },
        { status: 400 }
      );
    }

    const startsAt = cleanNullableDate(body.startsAt);
    const endsAt = cleanNullableDate(body.endsAt);

    const rangeError = validateDateRange(
      startsAt,
      endsAt
    );

    if (rangeError) {
      return NextResponse.json(
        { error: rangeError },
        { status: 400 }
      );
    }

    const isActive = body.isActive === true;
    const supabase = getSupabaseAdmin();

    if (isActive) {
      const { error: deactivateError } =
        await supabase
          .from("seasons")
          .update({
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .neq("id", id)
          .eq("is_active", true);

      if (deactivateError) throw deactivateError;
    }

    const { data, error } = await supabase
      .from("seasons")
      .update({
        name,
        starts_at: startsAt,
        ends_at: endsAt,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        "id,name,starts_at,ends_at,is_active,created_at,updated_at"
      )
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      season: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la temporada.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { error: "No autorizado." },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as {
      id?: unknown;
    };

    const id =
      typeof body.id === "string"
        ? body.id.trim()
        : "";

    if (!id) {
      return NextResponse.json(
        { error: "Falta el ID de la temporada." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("seasons")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar la temporada.",
      },
      { status: 500 }
    );
  }
}
