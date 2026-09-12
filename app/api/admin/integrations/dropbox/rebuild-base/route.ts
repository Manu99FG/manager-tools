import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin-auth";
import { rebuildPlayersFromBase } from "@/lib/player-roster-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await rebuildPlayersFromBase();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("[DROPBOX BASE PLAYERS REBUILD]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudieron reconstruir los jugadores" },
      { status: 500 }
    );
  }
}
