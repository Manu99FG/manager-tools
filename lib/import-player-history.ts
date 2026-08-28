import {
  getAllPlayers,
} from "@/lib/all-players";

import {
  savePlayerSnapshot,
} from "@/lib/player-history";

export type ImportError = {
  player: string;
  team: string;
  error: string;
};

export type ImportHistoryResult = {
  total: number;
  saved: number;
  unchanged: number;
  errors: number;

  errorDetails: ImportError[];
};

function getErrorMessage(
  error: unknown
): string {
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
      "string"
    ) {
      parts.push(
        `Detalles: ${possibleError.details}`
      );
    }

    if (
      typeof possibleError.hint ===
      "string"
    ) {
      parts.push(
        `Hint: ${possibleError.hint}`
      );
    }

    if (
      typeof possibleError.code ===
      "string"
    ) {
      parts.push(
        `Código: ${possibleError.code}`
      );
    }

    if (parts.length > 0) {
      return parts.join(" | ");
    }
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return String(error);
}

export async function importCurrentPlayerHistory(): Promise<ImportHistoryResult> {
  const players =
    await getAllPlayers();

  let saved = 0;
  let unchanged = 0;
  let errors = 0;

  const errorDetails:
    ImportError[] = [];

  for (
    const player of players
  ) {
    try {
      const result =
        await savePlayerSnapshot(
          player
        );

      if (
        result.status ===
        "saved"
      ) {
        saved++;
      } else {
        unchanged++;
      }
    } catch (error) {
      errors++;

      const message =
        getErrorMessage(
          error
        );

      console.error(
        `[HISTORIAL] ${player.teamCode} - ${player.name}:`,
        message
      );

      /*
       * Guardamos solo los primeros 20
       * para no devolver una respuesta
       * gigantesca si fallan 692.
       */
      if (
        errorDetails.length <
        20
      ) {
        errorDetails.push({
          player:
            player.name,

          team:
            player.teamCode,

          error:
            message,
        });
      }
    }
  }

  return {
    total:
      players.length,

    saved,

    unchanged,

    errors,

    errorDetails,
  };
}