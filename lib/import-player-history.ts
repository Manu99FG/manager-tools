import {
  getAllPlayers,
} from "@/lib/all-players";

import {
  savePlayerSnapshot,
} from "@/lib/player-history";

export type ImportHistoryResult = {
  total: number;
  saved: number;
  unchanged: number;
  errors: number;
};

export async function importCurrentPlayerHistory(): Promise<ImportHistoryResult> {
  const players =
    await getAllPlayers();

  let saved = 0;
  let unchanged = 0;
  let errors = 0;

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
    } catch (
      error
    ) {
      errors++;

      console.error(
        `Error importando ${player.name}`,
        error
      );
    }
  }

  return {
    total:
      players.length,

    saved,

    unchanged,

    errors,
  };
}