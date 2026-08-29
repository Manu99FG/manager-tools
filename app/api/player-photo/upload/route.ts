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

const MAX_FILE_SIZE =
  20 * 1024 * 1024;

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

    const formData =
      await request.formData();

    const playerId =
      String(
        formData.get(
          "playerId"
        ) ?? ""
      ).trim();

    const fileValue =
      formData.get("file");

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

    if (
      !(fileValue instanceof File)
    ) {
      return NextResponse.json(
        {
          error:
            "Falta la fotografía.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      fileValue.type !==
      "image/png"
    ) {
      return NextResponse.json(
        {
          error:
            "La fotografía final debe ser PNG.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      fileValue.size >
      MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "La fotografía no puede superar los 20 MB.",
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

    const previousPhotoPath =
      (
        player as {
          photo_path?:
            | string
            | null;
        }
      ).photo_path ?? null;

    const newPhotoPath =
      `${playerId}/${Date.now()}.png`;

    const buffer =
      Buffer.from(
        await fileValue.arrayBuffer()
      );

    const {
      error: uploadError,
    } = await supabase.storage
      .from("player-photos")
      .upload(
        newPhotoPath,
        buffer,
        {
          contentType:
            "image/png",
          upsert: false,
        }
      );

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: publicUrlData,
    } = supabase.storage
      .from("player-photos")
      .getPublicUrl(
        newPhotoPath
      );

    const photoUrl =
      publicUrlData.publicUrl;

    const {
      error: updateError,
    } = await supabase
      .from("players")
      .update({
        photo_url: photoUrl,
        photo_path:
          newPhotoPath,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", playerId);

    if (updateError) {
      await supabase.storage
        .from("player-photos")
        .remove([
          newPhotoPath,
        ]);

      throw updateError;
    }

    if (
      previousPhotoPath &&
      previousPhotoPath !==
        newPhotoPath
    ) {
      const {
        error: removeError,
      } = await supabase.storage
        .from("player-photos")
        .remove([
          previousPhotoPath,
        ]);

      if (removeError) {
        console.error(
          "No se pudo borrar la fotografía anterior:",
          removeError
        );
      }
    }

    return NextResponse.json({
      ok: true,
      photoUrl,
    });
  } catch (error) {
    console.error(
      "Error guardando foto de jugador:",
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
