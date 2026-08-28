import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  findPlayerIdByEsmsIdentity,
} from "@/lib/player-history";

export async function GET(
  request: NextRequest
) {
  const searchParams =
    request.nextUrl.searchParams;

  const name =
    searchParams.get(
      "name"
    );

  const nationality =
    searchParams.get(
      "nationality"
    );

  if (
    !name ||
    !nationality
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Faltan parámetros",
      },
      {
        status: 400,
      }
    );
  }

  const playerId =
    await findPlayerIdByEsmsIdentity(
      name,
      nationality
    );

  return NextResponse.json({
    ok: true,
    playerId,
  });
}