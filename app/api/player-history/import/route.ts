import { NextResponse } from "next/server";

import {
  importCurrentPlayerHistory,
} from "@/lib/import-player-history";

export const dynamic =
  "force-dynamic";

function serializeError(
  error: unknown
): string {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object"
  ) {
    const possibleError =
      error as {
        message?: unknown;
        details?: unknown;
        hint?: unknown;
        code?: unknown;
        status?: unknown;
      };

    const parts: string[] = [];

    if (
      typeof possibleError.message ===
      "string"
    ) {
      parts.push(
        possibleError.message
      );
    }

    if (
      typeof possibleError.details ===
      "string" &&
      possibleError.details
    ) {
      parts.push(
        `Detalles: ${possibleError.details}`
      );
    }

    if (
      typeof possibleError.hint ===
      "string" &&
      possibleError.hint
    ) {
      parts.push(
        `Hint: ${possibleError.hint}`
      );
    }

    if (
      typeof possibleError.code ===
      "string" &&
      possibleError.code
    ) {
      parts.push(
        `Código: ${possibleError.code}`
      );
    }

    if (
      possibleError.status !==
        undefined &&
      possibleError.status !==
        null
    ) {
      parts.push(
        `Status: ${String(
          possibleError.status
        )}`
      );
    }

    if (
      parts.length > 0
    ) {
      return parts.join(
        " | "
      );
    }

    try {
      return JSON.stringify(
        error
      );
    } catch {
      return String(error);
    }
  }

  return String(error);
}

export async function POST() {
  try {
    const result =
      await importCurrentPlayerHistory();

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    const message =
      serializeError(
        error
      );

    console.error(
      "[PLAYER HISTORY IMPORT]",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}