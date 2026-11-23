import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");
  const id = searchParams.get("id") ?? "";
  if ((kind !== "club" && kind !== "competition") || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db.from("manager_media")
      .select("storage_path").eq("entity_type", kind).eq("entity_id", id).maybeSingle();
    if (error) throw error;
    const imageUrl = data?.storage_path
      ? db.storage.from("manager-media").getPublicUrl(data.storage_path).data.publicUrl
      : null;
    return NextResponse.json({ imageUrl }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ imageUrl: null }, { status: 503 });
  }
}
