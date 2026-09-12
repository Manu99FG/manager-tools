import { NextRequest, NextResponse } from "next/server";
import { Dropbox } from "dropbox";

import { saveDropboxOAuthConnection } from "@/lib/dropbox";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const error = url.searchParams.get("error");
  if (error) {
    return NextResponse.redirect(new URL(`/admin?section=integraciones&dropbox=${encodeURIComponent(error)}`, request.url));
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = request.cookies.get("dropbox_oauth_state")?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/admin?section=integraciones&dropbox=state", request.url));
  }

  const appKey = process.env.DROPBOX_APP_KEY;
  const appSecret = process.env.DROPBOX_APP_SECRET;
  const redirectUri = process.env.DROPBOX_REDIRECT_URI || `${url.origin}/api/integrations/dropbox/callback`;

  if (!appKey || !appSecret) {
    return NextResponse.redirect(new URL("/admin?section=integraciones&dropbox=config", request.url));
  }

  try {
    const tokenResponse = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${appKey}:${appSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
      cache: "no-store",
    });

    if (!tokenResponse.ok) {
      throw new Error(`Dropbox OAuth ${tokenResponse.status}: ${await tokenResponse.text()}`);
    }

    const tokenData = await tokenResponse.json() as {
      access_token: string;
      refresh_token?: string;
      account_id?: string;
    };

    if (!tokenData.refresh_token) {
      throw new Error("Dropbox no devolvió refresh_token. Comprueba token_access_type=offline.");
    }

    const client = new Dropbox({ accessToken: tokenData.access_token });
    const account = await client.usersGetCurrentAccount();

    await saveDropboxOAuthConnection({
      refreshToken: tokenData.refresh_token,
      accountId: account.result.account_id,
      email: account.result.email ?? null,
      displayName: account.result.name?.display_name ?? null,
    });

    const response = NextResponse.redirect(new URL("/admin?section=integraciones&dropbox=connected", request.url));
    response.cookies.delete("dropbox_oauth_state");
    return response;
  } catch (oauthError) {
    console.error("Dropbox OAuth callback:", oauthError);
    return NextResponse.redirect(new URL("/admin?section=integraciones&dropbox=error", request.url));
  }
}
