import {
  NextResponse,
} from "next/server";

import {
  importCurrentPlayerHistory,
} from "@/lib/import-player-history";

export const dynamic =
  "force-dynamic";

export async function POST() {
  try {
    const result =
      await importCurrentPlayerHistory();

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (
    error
  ) {
    console.error(
      error
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Error desconocido",
      },
      {
        status: 500,
      }
    );
  }
}