import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin-auth";
import { disconnectDropbox } from "@/lib/dropbox";

export const runtime = "nodejs";

export async function POST() {
  if (!(await isAdminSession())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  await disconnectDropbox();
  return NextResponse.json({ ok: true });
}
