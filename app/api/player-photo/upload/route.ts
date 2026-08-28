import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

function isValidPassword(value: string) {
  const expected = process.env.ADMIN_PHOTO_PASSWORD;
  if (!expected) {
    throw new Error("Falta ADMIN_PHOTO_PASSWORD en las variables de entorno.");
  }
  return value === expected;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const playerIdValue = formData.get("playerId");
    const passwordValue = formData.get("adminPassword");
    const fileValue = formData.get("file");

    const playerId = typeof playerIdValue === "string" ? playerIdValue.trim() : "";
    const adminPassword = typeof passwordValue === "string" ? passwordValue : "";

    if (!playerId) {
      return NextResponse.json({ error: "Falta playerId." }, { status: 400 });
    }

    if (!isValidPassword(adminPassword)) {
      return NextResponse.json({ error: "Contraseña de administrador incorrecta." }, { status: 401 });
    }

    if (!(fileValue instanceof File)) {
      return NextResponse.json({ error: "No se recibió ninguna imagen." }, { status: 400 });
    }

    if (fileValue.type !== "image/png") {
      return NextResponse.json({ error: "La imagen procesada debe ser PNG." }, { status: 400 });
    }

    if (fileValue.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "La imagen supera los 20 MB." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("id, photo_path")
      .eq("id", playerId)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: "No se encontró el jugador." }, { status: 404 });
    }

    const oldPhotoPath = (player as { photo_path?: string | null }).photo_path ?? null;
    const bytes = Buffer.from(await fileValue.arrayBuffer());
    const newPhotoPath = `${playerId}/${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("player-photos")
      .upload(newPhotoPath, bytes, {
        contentType: "image/png",
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from("player-photos")
      .getPublicUrl(newPhotoPath);

    const photoUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from("players")
      .update({
        photo_url: photoUrl,
        photo_path: newPhotoPath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", playerId);

    if (updateError) {
      await supabase.storage.from("player-photos").remove([newPhotoPath]);
      throw updateError;
    }

    if (oldPhotoPath && oldPhotoPath !== newPhotoPath) {
      const { error: removeOldError } = await supabase.storage
        .from("player-photos")
        .remove([oldPhotoPath]);

      if (removeOldError) {
        console.error("No se pudo borrar la foto anterior:", removeOldError);
      }
    }

    return NextResponse.json({ ok: true, photoUrl });
  } catch (error) {
    console.error("Error guardando foto de jugador:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido." },
      { status: 500 }
    );
  }
}
