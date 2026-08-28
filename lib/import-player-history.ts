import {
  getAllPlayers,
  type GlobalEsmsPlayer,
} from "@/lib/all-players";

import {
  buildPlayerSnapshot,
  getHistoryEventType,
  getPlayerIdentityKey,
  hasPlayerChanged,
  TRACKED_STATS,
} from "@/lib/player-history";

import type {
  DatabasePlayer,
  PlayerSnapshot,
} from "@/lib/player-history-types";

import {
  getSupabaseAdmin,
} from "@/lib/supabase-admin";

/* =========================================================
   TIPOS
========================================================= */

export type ImportError = {
  player: string;
  team: string;
  error: string;
};

export type ImportHistoryResult = {
  total: number;

  newPlayers: number;

  saved: number;

  unchanged: number;

  transfers: number;

  events: number;

  errors: number;

  errorDetails:
    ImportError[];
};

/* =========================================================
   ERROR
========================================================= */

function getErrorMessage(
  error: unknown
) {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object"
  ) {
    const possible =
      error as {
        message?: unknown;
        details?: unknown;
        hint?: unknown;
        code?: unknown;
      };

    const parts: string[] =
      [];

    if (
      typeof possible.message ===
      "string"
    ) {
      parts.push(
        possible.message
      );
    }

    if (
      typeof possible.details ===
      "string"
    ) {
      parts.push(
        `Detalles: ${possible.details}`
      );
    }

    if (
      typeof possible.hint ===
      "string"
    ) {
      parts.push(
        `Hint: ${possible.hint}`
      );
    }

    if (
      typeof possible.code ===
      "string"
    ) {
      parts.push(
        `Código: ${possible.code}`
      );
    }

    if (
      parts.length >
      0
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

/* =========================================================
   ELIMINAR DUPLICADOS
========================================================= */

function deduplicatePlayers(
  players: GlobalEsmsPlayer[]
) {
  const map =
    new Map<
      string,
      GlobalEsmsPlayer
    >();

  for (
    const player of players
  ) {
    const key =
      getPlayerIdentityKey(
        player.name,
        player.nat
      );

    /*
     * Si hubiera accidentalmente
     * el mismo jugador dos veces,
     * conservamos la última aparición.
     */
    map.set(
      key,
      player
    );
  }

  return Array.from(
    map.values()
  );
}

/* =========================================================
   IMPORTACIÓN
========================================================= */

export async function importCurrentPlayerHistory(): Promise<ImportHistoryResult> {
  const supabase =
    getSupabaseAdmin();

  /*
   * getAllPlayers(false):
   * no queremos consultar IDs históricos
   * todavía porque precisamente estamos
   * haciendo la importación.
   */
  const rawPlayers =
    await getAllPlayers({
      includePlayerIds:
        false,
    });

  const players =
    deduplicatePlayers(
      rawPlayers
    );

  const now =
    new Date().toISOString();

  /* =======================================================
     1. LEER JUGADORES EXISTENTES
  ======================================================= */

  const {
    data:
      existingPlayersData,
    error:
      existingPlayersError,
  } =
    await supabase
      .from("players")
      .select("*");

  if (
    existingPlayersError
  ) {
    throw existingPlayersError;
  }

  const existingPlayers =
    existingPlayersData as DatabasePlayer[];

  const existingMap =
    new Map<
      string,
      DatabasePlayer
    >();

  for (
    const player of existingPlayers
  ) {
    existingMap.set(
      getPlayerIdentityKey(
        player.esms_name,
        player.nationality
      ),
      player
    );
  }

  /* =======================================================
     2. DETECTAR JUGADORES NUEVOS
  ======================================================= */

  const missingPlayers =
    players.filter(
      (player) =>
        !existingMap.has(
          getPlayerIdentityKey(
            player.name,
            player.nat
          )
        )
    );

  if (
    missingPlayers.length >
    0
  ) {
    const rows =
      missingPlayers.map(
        (player) => ({
          esms_name:
            player.name,

          nationality:
            player.nat,

          current_team_code:
            player.teamCode,

          created_at:
            now,

          updated_at:
            now,
        })
      );

    const {
      error:
        insertPlayersError,
    } =
      await supabase
        .from("players")
        .insert(rows);

    if (
      insertPlayersError
    ) {
      throw insertPlayersError;
    }
  }

  /* =======================================================
     3. VOLVER A LEER JUGADORES

     Ahora ya tenemos los UUID de los nuevos.
  ======================================================= */

  const {
    data:
      databasePlayersData,
    error:
      databasePlayersError,
  } =
    await supabase
      .from("players")
      .select("*");

  if (
    databasePlayersError
  ) {
    throw databasePlayersError;
  }

  const databasePlayers =
    databasePlayersData as DatabasePlayer[];

  const databaseMap =
    new Map<
      string,
      DatabasePlayer
    >();

  for (
    const player of databasePlayers
  ) {
    databaseMap.set(
      getPlayerIdentityKey(
        player.esms_name,
        player.nationality
      ),
      player
    );
  }

  /* =======================================================
     4. LEER SOLO ÚLTIMO SNAPSHOT

     Gracias a la VIEW que creamos.
  ======================================================= */

  const {
    data:
      latestSnapshotsData,
    error:
      latestSnapshotsError,
  } =
    await supabase
      .from(
        "latest_player_snapshots"
      )
      .select("*");

  if (
    latestSnapshotsError
  ) {
    throw latestSnapshotsError;
  }

  const latestSnapshots =
    latestSnapshotsData as PlayerSnapshot[];

  const snapshotMap =
    new Map<
      string,
      PlayerSnapshot
    >();

  for (
    const snapshot of latestSnapshots
  ) {
    snapshotMap.set(
      snapshot.player_id,
      snapshot
    );
  }

  /* =======================================================
     5. DETECTAR CAMBIOS EN MEMORIA
  ======================================================= */

  const changedPlayers: {
    player:
      GlobalEsmsPlayer;

    databasePlayer:
      DatabasePlayer;

    previous:
      PlayerSnapshot | null;
  }[] = [];

  let unchanged = 0;

  for (
    const player of players
  ) {
    const databasePlayer =
      databaseMap.get(
        getPlayerIdentityKey(
          player.name,
          player.nat
        )
      );

    if (
      !databasePlayer
    ) {
      throw new Error(
        `No se encontró el registro de ${player.name} después de crearlo.`
      );
    }

    const previous =
      snapshotMap.get(
        databasePlayer.id
      ) ?? null;

    if (
      previous &&
      !hasPlayerChanged(
        previous,
        player
      )
    ) {
      unchanged++;

      continue;
    }

    changedPlayers.push({
      player,
      databasePlayer,
      previous,
    });
  }

  /* =======================================================
     6. INSERTAR SNAPSHOTS DE UNA VEZ
  ======================================================= */

  let createdSnapshots: {
    id: string;
    player_id: string;
  }[] = [];

  if (
    changedPlayers.length >
    0
  ) {
    const snapshotRows =
      changedPlayers.map(
        ({
          player,
          databasePlayer,
        }) =>
          buildPlayerSnapshot(
            databasePlayer.id,
            player,
            now
          )
      );

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "player_snapshots"
        )
        .insert(
          snapshotRows
        )
        .select(
          "id, player_id"
        );

    if (error) {
      throw error;
    }

    createdSnapshots =
      data ?? [];
  }

  const createdSnapshotMap =
    new Map<
      string,
      string
    >();

  for (
    const snapshot of createdSnapshots
  ) {
    createdSnapshotMap.set(
      snapshot.player_id,
      snapshot.id
    );
  }

  /* =======================================================
     7. TRANSFERENCIAS
  ======================================================= */

  const transferRows =
    changedPlayers
      .filter(
        ({
          player,
          previous,
        }) =>
          previous !==
            null &&
          previous.team_code !==
            player.teamCode
      )
      .map(
        ({
          player,
          databasePlayer,
          previous,
        }) => ({
          player_id:
            databasePlayer.id,

          from_team_code:
            previous
              ?.team_code ??
            null,

          to_team_code:
            player.teamCode,

          transfer_date:
            now,
        })
      );

  if (
    transferRows.length >
    0
  ) {
    const {
      error,
    } =
      await supabase
        .from("transfers")
        .insert(
          transferRows
        );

    if (error) {
      throw error;
    }
  }

  /* =======================================================
     8. EVENTOS
  ======================================================= */

  const eventRows: {
    player_id: string;
    snapshot_id: string;
    event_type: string;
    stat: string;
    old_value: string;
    new_value: string;
    created_at: string;
  }[] = [];

  for (
    const {
      player,
      databasePlayer,
      previous,
    } of changedPlayers
  ) {
    if (!previous) {
      continue;
    }

    const snapshotId =
      createdSnapshotMap.get(
        databasePlayer.id
      );

    if (!snapshotId) {
      continue;
    }

    for (
      const stat of TRACKED_STATS
    ) {
      const oldValue =
        previous[stat];

      const newValue =
        player[stat];

      if (
        oldValue ===
        newValue
      ) {
        continue;
      }

      eventRows.push({
        player_id:
          databasePlayer.id,

        snapshot_id:
          snapshotId,

        event_type:
          getHistoryEventType(
            stat,
            oldValue,
            newValue
          ),

        stat,

        old_value:
          String(
            oldValue
          ),

        new_value:
          String(
            newValue
          ),

        created_at:
          now,
      });
    }
  }

  if (
    eventRows.length >
    0
  ) {
    /*
     * Por seguridad insertamos
     * eventos en lotes de 500.
     */
    const chunkSize =
      500;

    for (
      let index = 0;
      index <
      eventRows.length;
      index +=
        chunkSize
    ) {
      const chunk =
        eventRows.slice(
          index,
          index +
            chunkSize
        );

      const {
        error,
      } =
        await supabase
          .from(
            "player_events"
          )
          .insert(
            chunk
          );

      if (error) {
        throw error;
      }
    }
  }

  /* =======================================================
     9. ACTUALIZAR CLUB ACTUAL

     Usamos UUID como conflicto, por lo que
     esto sí puede hacerse en bloque.
  ======================================================= */

  const playerUpdates =
    changedPlayers.map(
      ({
        player,
        databasePlayer,
      }) => ({
        id:
          databasePlayer.id,

        esms_name:
          databasePlayer.esms_name,

        nationality:
          databasePlayer.nationality,

        current_team_code:
          player.teamCode,

        created_at:
          databasePlayer.created_at,

        updated_at:
          now,
      })
    );

  if (
    playerUpdates.length >
    0
  ) {
    const {
      error,
    } =
      await supabase
        .from("players")
        .upsert(
          playerUpdates,
          {
            onConflict:
              "id",
          }
        );

    if (error) {
      throw error;
    }
  }

  /* =======================================================
     RESULTADO
  ======================================================= */

  return {
    total:
      players.length,

    newPlayers:
      missingPlayers.length,

    saved:
      changedPlayers.length,

    unchanged,

    transfers:
      transferRows.length,

    events:
      eventRows.length,

    errors: 0,

    errorDetails: [],
  };
}