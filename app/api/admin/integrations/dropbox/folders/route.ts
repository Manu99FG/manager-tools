import { NextRequest, NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin-auth";
import { listDropboxFolder } from "@/lib/dropbox";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!(await isAdminSession())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const path = request.nextUrl.searchParams.get("path") || "";
  try {
    const entries = await listDropboxFolder(path);
    return NextResponse.json({
      path,
      folders: entries.filter((entry) => entry.tag === "folder"),
      files: entries.filter((entry) => entry.tag === "file" && entry.isRoster),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo leer Dropbox" }, { status: 500 });
  }
}
