import { NextRequest, NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin-auth";
import { saveDropboxFolderSettings, syncDropboxLiveFolderStatus } from "@/lib/dropbox";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const body = await request.json() as {
      baseFolderPath?: string | null;
      baseFiles?: string[];
      liveFolderPath?: string | null;
    };
    const baseFiles = Array.isArray(body.baseFiles) ? body.baseFiles.filter((value): value is string => typeof value === "string") : [];
    await saveDropboxFolderSettings({
      baseFolderPath: body.baseFolderPath || null,
      baseFiles,
      liveFolderPath: body.liveFolderPath || null,
    });
    const sync = body.liveFolderPath ? await syncDropboxLiveFolderStatus() : null;
    return NextResponse.json({ ok: true, sync });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo guardar la configuración" }, { status: 500 });
  }
}
