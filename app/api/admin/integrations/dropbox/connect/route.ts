import { randomBytes } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  const appKey = process.env.DROPBOX_APP_KEY;
  if (!appKey) {
    return NextResponse.redirect(new URL("/admin?section=integraciones&dropbox=config", request.url));
  }

  const redirectUri = process.env.DROPBOX_REDIRECT_URI || `${request.nextUrl.origin}/api/integrations/dropbox/callback`;
  const state = randomBytes(24).toString("base64url");
  const authorize = new URL("https://www.dropbox.com/oauth2/authorize");
  authorize.searchParams.set("client_id", appKey);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("token_access_type", "offline");
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("state", state);

  const response = NextResponse.redirect(authorize);
  response.cookies.set("dropbox_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
  return response;
}
