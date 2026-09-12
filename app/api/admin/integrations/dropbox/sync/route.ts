import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin-auth";
import { importCurrentPlayerHistory } from "@/lib/import-player-history";
import { syncDropboxLiveFolderStatus } from "@/lib/dropbox";

export const runtime = "nodejs";

export async function POST() {
  if (!(await isAdminSession())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const result = await syncDropboxLiveFolderStatus();
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  const players = await importCurrentPlayerHistory();
  return NextResponse.json({ ...result, players }, { status: 200 });
}
