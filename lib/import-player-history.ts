import {
  getAllPlayers,
  type GlobalEsmsPlayer,
} from "@/lib/all-players";

import {
  buildPlayerHistoryEvents,
  buildPlayerSnapshot,
  getPlayerIdentityKey,
  hasPlayerChanged,
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

  /* =======================================================
     PLANTILLAS
  ======================================================= */

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
     JUGADORES EXISTENTES
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
     NUEVOS JUGADORES
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
      error,
    } =
      await supabase
        .from("players")
        .insert(
          rows
        );

    if (
      error
    ) {
      throw error;
    }
  }

  /* =======================================================
     RECARGAR JUGADORES PARA IDS
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
     ÚLTIMOS SNAPSHOTS
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
     DETECTAR CAMBIOS
  ======================================================= */

  const changedPlayers: {
    player:
      GlobalEsmsPlayer;

    databasePlayer:
      DatabasePlayer;

    previous:
      PlayerSnapshot | null;
  }[] = [];

  let unchanged =
    0;

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
        `No se encontró ${player.name} en la base de datos.`
      );
    }

    const previous =
      snapshotMap.get(
        databasePlayer.id
      ) ??
      null;

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
     SNAPSHOTS
  ======================================================= */

  let createdSnapshots: {
    id: string;

    player_id: string;
  }[] = [];

  if (
    changedPlayers.length >
    0
  ) {
    const rows =
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
          rows
        )
        .select(
          "id, player_id"
        );

    if (
      error
    ) {
      throw error;
    }

    createdSnapshots =
      data ??
      [];
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
     TRANSFERENCIAS
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
        .from(
          "transfers"
        )
        .insert(
          transferRows
        );

    if (
      error
    ) {
      throw error;
    }
  }

  /* =======================================================
     EVENTOS
  ======================================================= */

  const eventRows =
    changedPlayers.flatMap(
      ({
        player,
        databasePlayer,
        previous,
      }) => {
        /*
         * Primer snapshot:
         * no existe valor anterior.
         */
        if (
          !previous
        ) {
          return [];
        }

        const snapshotId =
          createdSnapshotMap.get(
            databasePlayer.id
          );

        if (
          !snapshotId
        ) {
          return [];
        }

        return buildPlayerHistoryEvents({
          playerId:
            databasePlayer.id,

          snapshotId,

          previous,

          player,

          createdAt:
            now,
        });
      }
    );

  /* =======================================================
     INSERTAR EVENTOS EN BLOQUES
  ======================================================= */

  if (
    eventRows.length >
    0
  ) {
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

      if (
        error
      ) {
        throw error;
      }
    }
  }

  /* =======================================================
     ACTUALIZAR CLUB ACTUAL
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

    if (
      error
    ) {
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

    errors:
      0,

    errorDetails:
      [],
  };
}