import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin-auth";
import { syncDropboxLiveFolderStatus } from "@/lib/dropbox";

export const runtime = "nodejs";

export async function POST() {
  if (!(await isAdminSession())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const result = await syncDropboxLiveFolderStatus();
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
