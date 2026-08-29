import {
  NextResponse,
} from "next/server";

import {
  isAdminSession,
} from "@/lib/admin-auth";

import {
  getSupabaseAdmin,
} from "@/lib/supabase-admin";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

type RequestBody = {
  playerId?: string;
};

export async function POST(
  request: Request
) {
  try {
    if (
      !(await isAdminSession())
    ) {
      return NextResponse.json(
        {
          error:
            "No autorizado.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      (await request.json()) as RequestBody;

    const playerId =
      body.playerId?.trim() ??
      "";

    if (!playerId) {
      return NextResponse.json(
        {
          error:
            "Falta playerId.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      getSupabaseAdmin();

    const {
      data: player,
      error: playerError,
    } = await supabase
      .from("players")
      .select(
        "id, photo_path"
      )
      .eq("id", playerId)
      .single();

    if (
      playerError ||
      !player
    ) {
      return NextResponse.json(
        {
          error:
            "No se encontró el jugador.",
        },
        {
          status: 404,
        }
      );
    }

    const photoPath =
      (
        player as {
          photo_path?:
            | string
            | null;
        }
      ).photo_path;

    if (photoPath) {
      const {
        error: removeError,
      } = await supabase.storage
        .from("player-photos")
        .remove([
          photoPath,
        ]);

      if (removeError) {
        throw removeError;
      }
    }

    const {
      error: updateError,
    } = await supabase
      .from("players")
      .update({
        photo_url: null,
        photo_path: null,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", playerId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      ok: true,
      photoUrl: null,
    });
  } catch (error) {
    console.error(
      "Error eliminando foto de jugador:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido.",
      },
      {
        status: 500,
      }
    );
  }
}
