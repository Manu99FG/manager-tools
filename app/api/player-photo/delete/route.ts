import {
  NextResponse,
} from "next/server";

import {
  getSupabaseAdmin,
} from "@/lib/supabase-admin";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

const MAX_FILE_SIZE =
  20 * 1024 * 1024;

const ALLOWED_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

function isValidPassword(
  value: string
) {
  const expected =
    process.env
      .ADMIN_PHOTO_PASSWORD;

  if (!expected) {
    throw new Error(
      "Falta ADMIN_PHOTO_PASSWORD en las variables de entorno."
    );
  }

  return value === expected;
}

async function removeBackground(
  file: File
) {
  const apiKey =
    process.env
      .REMOVE_BG_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Falta REMOVE_BG_API_KEY en las variables de entorno."
    );
  }

  const formData =
    new FormData();

  formData.append(
    "image_file",
    file,
    file.name
  );

  formData.append(
    "size",
    "auto"
  );

  formData.append(
    "format",
    "png"
  );

  const response =
    await fetch(
      "https://api.remove.bg/v1.0/removebg",
      {
        method: "POST",
        headers: {
          "X-Api-Key":
            apiKey,
        },
        body: formData,
        cache: "no-store",
      }
    );

  if (!response.ok) {
    const details =
      await response.text();

    throw new Error(
      `remove.bg respondió ${response.status}: ${details}`
    );
  }

  return Buffer.from(
    await response.arrayBuffer()
  );
}

export async function POST(
  request: Request
) {
  try {
    const formData =
      await request.formData();

    const playerIdValue =
      formData.get(
        "playerId"
      );

    const passwordValue =
      formData.get(
        "adminPassword"
      );

    const fileValue =
      formData.get("file");

    const playerId =
      typeof playerIdValue ===
      "string"
        ? playerIdValue.trim()
        : "";

    const adminPassword =
      typeof passwordValue ===
      "string"
        ? passwordValue
        : "";

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
      !isValidPassword(
        adminPassword
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Contraseña de administrador incorrecta.",
        },
        {
          status: 401,
        }
      );
    }

    if (
      !(fileValue instanceof File)
    ) {
      return NextResponse.json(
        {
          error:
            "No se recibió ninguna imagen.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !ALLOWED_TYPES.has(
        fileValue.type
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Formato no permitido. Usa JPG, PNG o WEBP.",
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
            "La imagen supera los 20 MB.",
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

    const transparentPng =
      await removeBackground(
        fileValue
      );

    const filename =
      `${playerId}/${Date.now()}.png`;

    const {
      error: uploadError,
    } = await supabase.storage
      .from("player-photos")
      .upload(
        filename,
        transparentPng,
        {
          contentType:
            "image/png",
          cacheControl:
            "3600",
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
        filename
      );

    const photoUrl =
      publicUrlData.publicUrl;

    const {
      error: updateError,
    } = await supabase
      .from("players")
      .update({
        photo_url:
          photoUrl,
        photo_path:
          filename,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", playerId);

    if (updateError) {
      await supabase.storage
        .from(
          "player-photos"
        )
        .remove([
          filename,
        ]);

      throw updateError;
    }

    const previousPath =
      (
        player as {
          photo_path?:
            | string
            | null;
        }
      ).photo_path;

    if (
      previousPath &&
      previousPath !==
        filename
    ) {
      await supabase.storage
        .from(
          "player-photos"
        )
        .remove([
          previousPath,
        ]);
    }

    return NextResponse.json({
      ok: true,
      photoUrl,
    });
  } catch (error) {
    console.error(
      "Error subiendo foto de jugador:",
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
