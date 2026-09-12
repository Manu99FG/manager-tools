import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin-auth";
import { getAdminLineupDownloadPath } from "@/lib/admin-lineups";
import { getDropboxClient } from "@/lib/dropbox";

export const runtime = "nodejs";

export async function GET(
  request: Request
) {
  const isAdmin =
    await isAdminSession();

  if (!isAdmin) {
    return NextResponse.json(
      {
        error:
          "No autorizado.",
      },
      {
        status: 401,
      }
    );
  }

  const url =
    new URL(
      request.url
    );

  const competitionId =
    url.searchParams.get(
      "competitionId"
    );

  const roundId =
    url.searchParams.get(
      "roundId"
    );

  const teamCode =
    url.searchParams.get(
      "teamCode"
    );

  if (
    !competitionId ||
    !roundId ||
    !teamCode
  ) {
    return NextResponse.json(
      {
        error:
          "Faltan parámetros.",
      },
      {
        status: 400,
      }
    );
  }

  const dropboxPath =
    await getAdminLineupDownloadPath({
      competitionId,
      roundId,
      teamCode,
    });

  if (!dropboxPath) {
    return NextResponse.json(
      {
        error:
          "Alineación no encontrada.",
      },
      {
        status: 404,
      }
    );
  }

  const dropbox =
    await getDropboxClient();

  try {
    const response =
      await dropbox.filesGetTemporaryLink({
        path:
          dropboxPath,
      });

    return NextResponse.redirect(
      response.result.link
    );
  } catch (error) {
    console.error(
      "Error descargando alineación:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo descargar la alineación.",
      },
      {
        status: 500,
      }
    );
  }
}
