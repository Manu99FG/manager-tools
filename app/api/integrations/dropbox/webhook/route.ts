import { createHmac, timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { importCurrentPlayerHistory } from "@/lib/import-player-history";

import {
  getDropboxIntegrationSettings,
  markDropboxWebhookEvent,
  syncDropboxLiveFolderStatus,
} from "@/lib/dropbox";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get("challenge") ?? "";
  return new NextResponse(challenge, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: NextRequest) {
  const secret = process.env.DROPBOX_APP_SECRET;
  if (!secret) return new NextResponse("Missing secret", { status: 500 });

  const rawBody = await request.text();
  const supplied = request.headers.get("x-dropbox-signature") ?? "";
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  try {
    const payload = JSON.parse(rawBody) as { list_folder?: { accounts?: string[] } };
    const accounts = payload.list_folder?.accounts ?? [];
    const settings = await getDropboxIntegrationSettings();
    if (settings.accountId && accounts.includes(settings.accountId)) {
      await markDropboxWebhookEvent();
      const sync = await syncDropboxLiveFolderStatus();
      if (sync.ok) {
        await importCurrentPlayerHistory();
      }
    }
  } catch (error) {
    console.error("Dropbox webhook:", error);
  }

  return new NextResponse("OK", { status: 200 });
}
