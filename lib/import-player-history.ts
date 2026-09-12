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

type ResolvedPlayer = {
  player:
    GlobalEsmsPlayer;

  databasePlayer:
    DatabasePlayer;
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
   IDENTIDAD

   IMPORTANTE:
   ----------
   getPlayerIdentityKey(name, nat) sigue siendo útil como
   "familia de identidad", pero YA NO es suficiente para
   identificar un registro concreto cuando existen homónimos.

   Ejemplo válido:
   FLA + M_Cunha + bra
   MUN + M_Cunha + bra

   La identidad permanente real es players.id (UUID).
========================================================= */

function normalize(
  value: string
) {
  return value
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase(
      "es"
    );
}

function getRosterKey(
  teamCode: string,
  name: string,
  nationality: string
) {
  return [
    teamCode
      .trim()
      .toUpperCase(),
    normalize(name),
    normalize(
      nationality
    ),
  ].join("::");
}

function getBaseIdentityKey(
  name: string,
  nationality: string
) {
  return getPlayerIdentityKey(
    name,
    nationality
  );
}

/* =========================================================
   ELIMINAR DUPLICADOS DE LA IMPORTACIÓN ACTUAL

   Antes se deduplicaba por nombre+nacionalidad.
   Eso eliminaba uno de dos homónimos.

   Ahora SOLO consideramos duplicado si aparece dos veces
   dentro del MISMO equipo con mismo nombre+nacionalidad.
========================================================= */

function deduplicatePlayers(
  players:
    GlobalEsmsPlayer[]
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
      getRosterKey(
        player.teamCode,
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
   AGRUPAR
========================================================= */

function groupCurrentPlayers(
  players:
    GlobalEsmsPlayer[]
) {
  const groups =
    new Map<
      string,
      GlobalEsmsPlayer[]
    >();

  for (
    const player of players
  ) {
    const key =
      getBaseIdentityKey(
        player.name,
        player.nat
      );

    const current =
      groups.get(key) ??
      [];

    current.push(
      player
    );

    groups.set(
      key,
      current
    );
  }

  return groups;
}

function groupDatabasePlayers(
  players:
    DatabasePlayer[]
) {
  const groups =
    new Map<
      string,
      DatabasePlayer[]
    >();

  for (
    const player of players
  ) {
    const key =
      getBaseIdentityKey(
        player.esms_name,
        player.nationality
      );

    const current =
      groups.get(key) ??
      [];

    current.push(
      player
    );

    groups.set(
      key,
      current
    );
  }

  return groups;
}

/* =========================================================
   RESOLVER IDENTIDADES EXISTENTES

   Estrategia segura:

   1. Primero:
      mismo nombre + nacionalidad + equipo actual.

      Esto resuelve automáticamente:
      FLA/M_Cunha y MUN/M_Cunha como UUID diferentes.

   2. Después:
      dentro de una familia nombre+nacionalidad,
      si queda EXACTAMENTE:
      - 1 jugador actual sin resolver
      - 1 registro DB sin usar

      lo interpretamos como un traspaso.

   3. Si quedan varios registros y varios jugadores sin
      resolver, NO adivinamos.

      Ejemplo extremo:
      dos M_Cunha cambian de equipo simultáneamente.

      En ese caso detenemos la importación antes de corromper
      historiales.
========================================================= */

function resolveExistingPlayers(
  currentPlayers:
    GlobalEsmsPlayer[],
  databasePlayers:
    DatabasePlayer[]
) {
  const currentGroups =
    groupCurrentPlayers(
      currentPlayers
    );

  const databaseGroups =
    groupDatabasePlayers(
      databasePlayers
    );

  const resolved =
    new Map<
      string,
      DatabasePlayer
    >();

  const newPlayers:
    GlobalEsmsPlayer[] =
    [];

  const allKeys =
    new Set<string>([
      ...currentGroups.keys(),
      ...databaseGroups.keys(),
    ]);

  for (
    const baseKey of
      allKeys
  ) {
    const currentGroup =
      currentGroups.get(
        baseKey
      ) ?? [];

    const databaseGroup =
      databaseGroups.get(
        baseKey
      ) ?? [];

    if (
      currentGroup.length ===
      0
    ) {
      continue;
    }

    const usedDatabaseIds =
      new Set<string>();

    const unresolvedCurrent:
      GlobalEsmsPlayer[] =
      [];

    /* -------------------------------------------------------
       A. Coincidencia exacta por club actual
    ------------------------------------------------------- */

    for (
      const player of
        currentGroup
    ) {
      const exactCandidates =
        databaseGroup.filter(
          (
            databasePlayer
          ) =>
            !usedDatabaseIds.has(
              databasePlayer.id
            ) &&
            databasePlayer.current_team_code
              ?.trim()
              .toUpperCase() ===
              player.teamCode
                .trim()
                .toUpperCase()
        );

      if (
        exactCandidates.length ===
        1
      ) {
        const match =
          exactCandidates[0];

        usedDatabaseIds.add(
          match.id
        );

        resolved.set(
          getRosterKey(
            player.teamCode,
            player.name,
            player.nat
          ),
          match
        );

        continue;
      }

      if (
        exactCandidates.length >
        1
      ) {
        throw new Error(
          [
            `Hay varios registros de base de datos para ${player.name}`,
            `(${player.nat}) dentro del equipo ${player.teamCode}.`,
            "Hay que corregir esos duplicados antes de importar.",
          ].join(" ")
        );
      }

      unresolvedCurrent.push(
        player
      );
    }

    const unusedDatabase =
      databaseGroup.filter(
        (
          databasePlayer
        ) =>
          !usedDatabaseIds.has(
            databasePlayer.id
          )
      );

    /* -------------------------------------------------------
       B. Traspaso inequívoco
    ------------------------------------------------------- */

    if (
      unresolvedCurrent.length ===
        1 &&
      unusedDatabase.length ===
        1
    ) {
      const player =
        unresolvedCurrent[0];

      const databasePlayer =
        unusedDatabase[0];

      resolved.set(
        getRosterKey(
          player.teamCode,
          player.name,
          player.nat
        ),
        databasePlayer
      );

      continue;
    }

    /* -------------------------------------------------------
       C. Ningún registro previo:
          son jugadores nuevos.
    ------------------------------------------------------- */

    if (
      unusedDatabase.length ===
      0
    ) {
      newPlayers.push(
        ...unresolvedCurrent
      );

      continue;
    }

    /* -------------------------------------------------------
       D. Hay registros previos pero no podemos saber qué UUID
          corresponde a qué jugador.

          No creamos IDs nuevos a ciegas.
    ------------------------------------------------------- */

    if (
      unresolvedCurrent.length >
      0
    ) {
      const currentDescription =
        unresolvedCurrent
          .map(
            (
              player
            ) =>
              `${player.teamCode}/${player.name}`
          )
          .join(", ");

      const databaseDescription =
        unusedDatabase
          .map(
            (
              player
            ) =>
              `${
                player.current_team_code ??
                "SIN_EQUIPO"
              }/${player.esms_name}/${player.id}`
          )
          .join(", ");

      throw new Error(
        [
          "Identidad ambigua detectada.",
          `Jugadores actuales: ${currentDescription}.`,
          `Registros posibles: ${databaseDescription}.`,
          "No se ha modificado ningún historial de este grupo para evitar mezclar jugadores homónimos.",
        ].join(" ")
      );
    }
  }

  return {
    resolved,
    newPlayers,
  };
}

/* =========================================================
   IMPORTACIÓN
========================================================= */

export async function importCurrentPlayerHistory(): Promise<ImportHistoryResult> {
  const supabase =
    getSupabaseAdmin();

  /*
   * No incluimos IDs históricos aquí porque esta función
   * es precisamente la encargada de resolverlos.
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
    existingPlayersData as
      DatabasePlayer[];

  /* =======================================================
     2. RESOLVER UUID EXISTENTES + JUGADORES NUEVOS
  ======================================================= */

  const {
    resolved:
      initialResolved,
    newPlayers:
      missingPlayers,
  } =
    resolveExistingPlayers(
      players,
      existingPlayers
    );

  /* =======================================================
     3. CREAR SOLO LOS JUGADORES QUE REALMENTE FALTAN
  ======================================================= */

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

          owner_team_code:
            player.teamCode,

          origin_team_code:
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
     4. VOLVER A LEER JUGADORES

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
    databasePlayersData as
      DatabasePlayer[];

  /*
   * Volvemos a resolver con la base ya completa.
   * En este punto cada jugador actual debe quedar asociado
   * a exactamente un UUID.
   */
  const {
    resolved:
      finalResolved,
    newPlayers:
      stillMissing,
  } =
    resolveExistingPlayers(
      players,
      databasePlayers
    );

  if (
    stillMissing.length >
    0
  ) {
    throw new Error(
      `No se pudieron resolver ${stillMissing.length} jugadores después de crearlos.`
    );
  }

  /*
   * initialResolved se conserva conceptualmente para que sea
   * evidente que los IDs previos no se recrean. finalResolved
   * es el mapa definitivo tras insertar nuevos registros.
   */
  void initialResolved;

  /* =======================================================
     5. LEER SOLO ÚLTIMO SNAPSHOT
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
    latestSnapshotsData as
      PlayerSnapshot[];

  const snapshotMap =
    new Map<
      string,
      PlayerSnapshot
    >();

  for (
    const snapshot of
      latestSnapshots
  ) {
    snapshotMap.set(
      snapshot.player_id,
      snapshot
    );
  }

  /* =======================================================
     6. DETECTAR CAMBIOS EN MEMORIA
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
      finalResolved.get(
        getRosterKey(
          player.teamCode,
          player.name,
          player.nat
        )
      );

    if (
      !databasePlayer
    ) {
      throw new Error(
        `No se encontró el UUID de ${player.teamCode}/${player.name}/${player.nat}.`
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

      /*
       * Aunque las estadísticas no hayan cambiado,
       * el club actual debería coincidir.
       *
       * Si cambió el club, hasPlayerChanged debería haberlo
       * detectado por el snapshot; por tanto no actualizamos
       * nada aquí.
       */
      continue;
    }

    changedPlayers.push({
      player,
      databasePlayer,
      previous,
    });
  }

  /* =======================================================
     7. INSERTAR SNAPSHOTS DE UNA VEZ
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
    const snapshot of
      createdSnapshots
  ) {
    createdSnapshotMap.set(
      snapshot.player_id,
      snapshot.id
    );
  }

  /* =======================================================
     8. TRANSFERENCIAS
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

          movement_type:
            "PENDING",

          owner_team_code:
            databasePlayer.owner_team_code ??
            previous?.team_code ??
            null,
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
     9. EVENTOS
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
      const stat of
        TRACKED_STATS
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
     10. ACTUALIZAR CLUB ACTUAL

     Siempre por UUID.
     Nunca por nombre.
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

        owner_team_code:
          databasePlayer.owner_team_code ??
          databasePlayer.current_team_code ??
          player.teamCode,

        origin_team_code:
          databasePlayer.origin_team_code ??
          databasePlayer.current_team_code ??
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
