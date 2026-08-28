import type {
  GlobalEsmsPlayer,
} from "@/lib/all-players";

import {
  getSupabaseAdmin,
} from "@/lib/supabase-admin";

import {
  getDropboxClient,
} from "@/lib/dropbox";

import {
  getPlantillasFiles,
} from "@/lib/plantillas";

import {
  parseEsmsPlantilla,
} from "@/lib/parser-esms";

import type {
  DatabasePlayer,
  PlayerHistoryEvent,
  PlayerSnapshot,
  PlayerTransfer,
} from "@/lib/player-history-types";

/* =========================================================
   ESTADÍSTICAS
========================================================= */

export const TRACKED_STATS = [
  "age",
  "ag",

  "st",
  "tk",
  "ps",
  "sh",

  "kab",
  "tab",
  "pab",
  "sab",

  "gam",
  "sub",
  "min",
  "mom",

  "sav",
  "con",
  "ktk",
  "kps",
  "sht",
  "gls",
  "ass",

  "dp",
  "inj",
  "sus",
  "fit",
] as const;

export type TrackedStat =
  (typeof TRACKED_STATS)[number];

/* =========================================================
   PARES MEDIA / EXP
========================================================= */

export const SKILL_PAIRS = [
  {
    rating:
      "st",
    exp:
      "kab",
  },
  {
    rating:
      "tk",
    exp:
      "tab",
  },
  {
    rating:
      "ps",
    exp:
      "pab",
  },
  {
    rating:
      "sh",
    exp:
      "sab",
  },
] as const;

export type RatingStat =
  (typeof SKILL_PAIRS)[number]["rating"];

export type ExpStat =
  (typeof SKILL_PAIRS)[number]["exp"];

/* =========================================================
   ESTADÍSTICAS NO LIGADAS A MEDIA / EXP
========================================================= */

const NON_SKILL_STATS = [
  "age",
  "ag",

  "gam",
  "sub",
  "min",
  "mom",

  "sav",
  "con",
  "ktk",
  "kps",
  "sht",
  "gls",
  "ass",

  "dp",
  "inj",
  "sus",
  "fit",
] as const;

/* =========================================================
   NORMALIZACIÓN
========================================================= */

export function normalizePlayerName(
  value: string
) {
  return value
    .trim()
    .toLowerCase();
}

export function normalizeNationality(
  value: string
) {
  return value
    .trim()
    .toLowerCase();
}

export function getPlayerIdentityKey(
  name: string,
  nationality: string
) {
  return `${normalizePlayerName(
    name
  )}::${normalizeNationality(
    nationality
  )}`;
}

/* =========================================================
   EXP TOTAL ESMS

   Ejemplos:

   19 950 = 19950
   20 150 = 20150

   Diferencia real:
   +200 EXP
========================================================= */

export function getTotalSkillExp(
  rating: number,
  exp: number
) {
  return (
    rating * 1000 +
    exp
  );
}

export function getEffectiveExpChange(
  oldRating: number,
  oldExp: number,
  newRating: number,
  newExp: number
) {
  return (
    getTotalSkillExp(
      newRating,
      newExp
    ) -
    getTotalSkillExp(
      oldRating,
      oldExp
    )
  );
}

/* =========================================================
   CONVERSIÓN SNAPSHOT
========================================================= */

export function buildPlayerSnapshot(
  playerId: string,
  player: GlobalEsmsPlayer,
  snapshotDate: string
) {
  return {
    player_id:
      playerId,

    team_code:
      player.teamCode,

    snapshot_date:
      snapshotDate,

    age:
      player.age,

    st:
      player.st,

    tk:
      player.tk,

    ps:
      player.ps,

    sh:
      player.sh,

    ag:
      player.ag,

    kab:
      player.kab,

    tab:
      player.tab,

    pab:
      player.pab,

    sab:
      player.sab,

    gam:
      player.gam,

    sub:
      player.sub,

    min:
      player.min,

    mom:
      player.mom,

    sav:
      player.sav,

    con:
      player.con,

    ktk:
      player.ktk,

    kps:
      player.kps,

    sht:
      player.sht,

    gls:
      player.gls,

    ass:
      player.ass,

    dp:
      player.dp,

    inj:
      player.inj,

    sus:
      player.sus,

    fit:
      player.fit,
  };
}

/* =========================================================
   ¿HA CAMBIADO?
========================================================= */

export function hasPlayerChanged(
  previous: PlayerSnapshot,
  player: GlobalEsmsPlayer
) {
  if (
    previous.team_code !==
    player.teamCode
  ) {
    return true;
  }

  return TRACKED_STATS.some(
    (stat) =>
      previous[stat] !==
      player[stat]
  );
}

/* =========================================================
   TIPO DE EVENTO
========================================================= */

export function getHistoryEventType(
  stat: TrackedStat,
  oldValue: number,
  newValue: number
) {
  const progressionStats:
    TrackedStat[] = [
      "st",
      "tk",
      "ps",
      "sh",

      "kab",
      "tab",
      "pab",
      "sab",
    ];

  if (
    progressionStats.includes(
      stat
    )
  ) {
    if (
      newValue >
      oldValue
    ) {
      return "progression";
    }

    return "regression";
  }

  return "stat_change";
}

/* =========================================================
   EVENTO
========================================================= */

export type HistoryEventRow = {
  player_id: string;

  snapshot_id: string;

  event_type: string;

  stat: string;

  old_value: string;

  new_value: string;

  created_at: string;
};

/* =========================================================
   CREAR EVENTOS DE UN JUGADOR

   IMPORTANTE:

   Para KAb / TAb / PAb / SAb NO guardamos
   solamente la EXP visible.

   Guardamos la EXP TOTAL:

   rating × 1000 + exp

   Así una bajada:

   20 750
   ↓
   19 750

   genera:

   St:
   20 → 19

   KAb:
   20750 → 19750

   diferencia:
   -1000 EXP
========================================================= */

export function buildPlayerHistoryEvents({
  playerId,
  snapshotId,
  previous,
  player,
  createdAt,
}: {
  playerId: string;

  snapshotId: string;

  previous: PlayerSnapshot;

  player: GlobalEsmsPlayer;

  createdAt: string;
}): HistoryEventRow[] {
  const rows:
    HistoryEventRow[] =
      [];

  /* =======================================================
     1. MEDIAS + EXP
  ======================================================= */

  for (
    const pair of SKILL_PAIRS
  ) {
    const ratingStat =
      pair.rating;

    const expStat =
      pair.exp;

    const oldRating =
      previous[
        ratingStat
      ];

    const newRating =
      player[
        ratingStat
      ];

    const oldExp =
      previous[
        expStat
      ];

    const newExp =
      player[
        expStat
      ];

    /* =====================================================
       EVENTO DE MEDIA
    ===================================================== */

    if (
      oldRating !==
      newRating
    ) {
      rows.push({
        player_id:
          playerId,

        snapshot_id:
          snapshotId,

        event_type:
          getHistoryEventType(
            ratingStat,
            oldRating,
            newRating
          ),

        stat:
          ratingStat,

        old_value:
          String(
            oldRating
          ),

        new_value:
          String(
            newRating
          ),

        created_at:
          createdAt,
      });
    }

    /* =====================================================
       EVENTO EXP REAL
    ===================================================== */

    const oldTotalExp =
      getTotalSkillExp(
        oldRating,
        oldExp
      );

    const newTotalExp =
      getTotalSkillExp(
        newRating,
        newExp
      );

    if (
      oldTotalExp !==
      newTotalExp
    ) {
      rows.push({
        player_id:
          playerId,

        snapshot_id:
          snapshotId,

        event_type:
          newTotalExp >
          oldTotalExp
            ? "progression"
            : "regression",

        stat:
          expStat,

        old_value:
          String(
            oldTotalExp
          ),

        new_value:
          String(
            newTotalExp
          ),

        created_at:
          createdAt,
      });
    }
  }

  /* =======================================================
     2. RESTO DE ESTADÍSTICAS
  ======================================================= */

  for (
    const stat of NON_SKILL_STATS
  ) {
    const oldValue =
      previous[
        stat
      ];

    const newValue =
      player[
        stat
      ];

    if (
      oldValue ===
      newValue
    ) {
      continue;
    }

    rows.push({
      player_id:
        playerId,

      snapshot_id:
        snapshotId,

      event_type:
        "stat_change",

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
        createdAt,
    });
  }

  return rows;
}

/* =========================================================
   CONVERTIR JUGADOR DE PLANTILLA
========================================================= */

function toGlobalPlayer(
  player: ReturnType<
    typeof parseEsmsPlantilla
  >[number],
  teamCode: string
): GlobalEsmsPlayer {
  return {
    ...player,

    teamCode,

    teamName:
      teamCode,

    playerId:
      null,
  };
}

/* =========================================================
   BUSCAR JUGADOR EN PLANTILLA
========================================================= */

async function findPlayerInRoster(
  path: string,
  teamCode: string,
  identityKey: string
): Promise<
  GlobalEsmsPlayer | null
> {
  const dbx =
    getDropboxClient();

  try {
    const response =
      await dbx.filesDownload({
        path,
      });

    const fileBlob =
      response.result.fileBlob;

    if (
      !fileBlob
    ) {
      return null;
    }

    const text =
      await fileBlob.text();

    const players =
      parseEsmsPlantilla(
        text
      );

    const found =
      players.find(
        (player) =>
          getPlayerIdentityKey(
            player.name,
            player.nat
          ) ===
          identityKey
      );

    if (
      !found
    ) {
      return null;
    }

    return toGlobalPlayer(
      found,
      teamCode
    );
  } catch (
    error
  ) {
    console.error(
      `Error leyendo ${teamCode}:`,
      error
    );

    return null;
  }
}

/* =========================================================
   BUSCAR JUGADOR ACTUAL EN DROPBOX
========================================================= */

async function findCurrentPlayerInDropbox(
  databasePlayer: DatabasePlayer
): Promise<
  GlobalEsmsPlayer | null
> {
  const identityKey =
    getPlayerIdentityKey(
      databasePlayer.esms_name,
      databasePlayer.nationality
    );

  /* =======================================================
     PRIMERO SU CLUB ACTUAL
  ======================================================= */

  if (
    databasePlayer.current_team_code
  ) {
    const teamCode =
      databasePlayer.current_team_code.toUpperCase();

    const path =
      `/ESO - Evolution Soccer Online/Plantillas/${teamCode}.txt`;

    const found =
      await findPlayerInRoster(
        path,
        teamCode,
        identityKey
      );

    if (
      found
    ) {
      return found;
    }
  }

  /* =======================================================
     SI YA NO ESTÁ AHÍ, BUSCAR POSIBLE TRASPASO
  ======================================================= */

  const files =
    await getPlantillasFiles();

  const previousTeam =
    databasePlayer.current_team_code
      ?.toUpperCase();

  const candidates =
    files.filter(
      (file) =>
        file.name !==
        previousTeam
    );

  const results =
    await Promise.all(
      candidates.map(
        (file) =>
          findPlayerInRoster(
            file.path,
            file.name,
            identityKey
          )
      )
    );

  return (
    results.find(
      (
        player
      ): player is GlobalEsmsPlayer =>
        player !==
        null
    ) ??
    null
  );
}

/* =========================================================
   RESULTADO SYNC
========================================================= */

export type PlayerSyncResult = {
  status:
    | "updated"
    | "unchanged"
    | "not_found"
    | "initial_snapshot";

  snapshotCreated:
    boolean;

  transferCreated:
    boolean;

  eventsCreated:
    number;
};

/* =========================================================
   SINCRONIZAR JUGADOR
========================================================= */

export async function syncPlayerHistory(
  playerId: string
): Promise<
  PlayerSyncResult
> {
  const supabase =
    getSupabaseAdmin();

  /* =======================================================
     JUGADOR
  ======================================================= */

  const {
    data:
      databasePlayerData,
    error:
      databasePlayerError,
  } =
    await supabase
      .from("players")
      .select("*")
      .eq(
        "id",
        playerId
      )
      .single();

  if (
    databasePlayerError
  ) {
    throw databasePlayerError;
  }

  const databasePlayer =
    databasePlayerData as DatabasePlayer;

  /* =======================================================
     DROPBOX
  ======================================================= */

  const currentPlayer =
    await findCurrentPlayerInDropbox(
      databasePlayer
    );

  if (
    !currentPlayer
  ) {
    return {
      status:
        "not_found",

      snapshotCreated:
        false,

      transferCreated:
        false,

      eventsCreated:
        0,
    };
  }

  /* =======================================================
     ÚLTIMO SNAPSHOT
  ======================================================= */

  const {
    data:
      previousData,
    error:
      previousError,
  } =
    await supabase
      .from(
        "player_snapshots"
      )
      .select("*")
      .eq(
        "player_id",
        playerId
      )
      .order(
        "snapshot_date",
        {
          ascending:
            false,
        }
      )
      .limit(1)
      .maybeSingle();

  if (
    previousError
  ) {
    throw previousError;
  }

  const previous =
    previousData
      ? previousData as PlayerSnapshot
      : null;

  /* =======================================================
     SIN CAMBIOS
  ======================================================= */

  if (
    previous &&
    !hasPlayerChanged(
      previous,
      currentPlayer
    )
  ) {
    return {
      status:
        "unchanged",

      snapshotCreated:
        false,

      transferCreated:
        false,

      eventsCreated:
        0,
    };
  }

  const now =
    new Date().toISOString();

  /* =======================================================
     SNAPSHOT
  ======================================================= */

  const {
    data:
      createdSnapshot,
    error:
      snapshotError,
  } =
    await supabase
      .from(
        "player_snapshots"
      )
      .insert(
        buildPlayerSnapshot(
          playerId,
          currentPlayer,
          now
        )
      )
      .select(
        "id"
      )
      .single();

  if (
    snapshotError
  ) {
    throw snapshotError;
  }

  /* =======================================================
     PRIMER SNAPSHOT
  ======================================================= */

  if (
    !previous
  ) {
    const {
      error:
        updateError,
    } =
      await supabase
        .from("players")
        .update({
          current_team_code:
            currentPlayer.teamCode,

          updated_at:
            now,
        })
        .eq(
          "id",
          playerId
        );

    if (
      updateError
    ) {
      throw updateError;
    }

    return {
      status:
        "initial_snapshot",

      snapshotCreated:
        true,

      transferCreated:
        false,

      eventsCreated:
        0,
    };
  }

  /* =======================================================
     TRANSFERENCIA
  ======================================================= */

  let transferCreated =
    false;

  if (
    previous.team_code !==
    currentPlayer.teamCode
  ) {
    const {
      error:
        transferError,
    } =
      await supabase
        .from(
          "transfers"
        )
        .insert({
          player_id:
            playerId,

          from_team_code:
            previous.team_code,

          to_team_code:
            currentPlayer.teamCode,

          transfer_date:
            now,
        });

    if (
      transferError
    ) {
      throw transferError;
    }

    transferCreated =
      true;
  }

  /* =======================================================
     EVENTOS
  ======================================================= */

  const eventRows =
    buildPlayerHistoryEvents({
      playerId,

      snapshotId:
        createdSnapshot.id,

      previous,

      player:
        currentPlayer,

      createdAt:
        now,
    });

  if (
    eventRows.length >
    0
  ) {
    const {
      error:
        eventsError,
    } =
      await supabase
        .from(
          "player_events"
        )
        .insert(
          eventRows
        );

    if (
      eventsError
    ) {
      throw eventsError;
    }
  }

  /* =======================================================
     ACTUALIZAR PLAYER
  ======================================================= */

  const {
    error:
      updateError,
  } =
    await supabase
      .from("players")
      .update({
        current_team_code:
          currentPlayer.teamCode,

        updated_at:
          now,
      })
      .eq(
        "id",
        playerId
      );

  if (
    updateError
  ) {
    throw updateError;
  }

  return {
    status:
      "updated",

    snapshotCreated:
      true,

    transferCreated,

    eventsCreated:
      eventRows.length,
  };
}

/* =========================================================
   DATOS PÁGINA JUGADOR
========================================================= */

export async function getPlayerPageData(
  playerId: string
) {
  try {
    await syncPlayerHistory(
      playerId
    );
  } catch (
    error
  ) {
    console.error(
      `Error sincronizando ${playerId}:`,
      error
    );
  }

  const supabase =
    getSupabaseAdmin();

  const [
    playerResult,
    snapshotsResult,
    transfersResult,
    eventsResult,
  ] =
    await Promise.all([
      supabase
        .from("players")
        .select("*")
        .eq(
          "id",
          playerId
        )
        .single(),

      supabase
        .from(
          "player_snapshots"
        )
        .select("*")
        .eq(
          "player_id",
          playerId
        )
        .order(
          "snapshot_date",
          {
            ascending:
              false,
          }
        ),

      supabase
        .from(
          "transfers"
        )
        .select("*")
        .eq(
          "player_id",
          playerId
        )
        .order(
          "transfer_date",
          {
            ascending:
              false,
          }
        ),

      supabase
        .from(
          "player_events"
        )
        .select("*")
        .eq(
          "player_id",
          playerId
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),
    ]);

  if (
    playerResult.error
  ) {
    throw playerResult.error;
  }

  if (
    snapshotsResult.error
  ) {
    throw snapshotsResult.error;
  }

  if (
    transfersResult.error
  ) {
    throw transfersResult.error;
  }

  if (
    eventsResult.error
  ) {
    throw eventsResult.error;
  }

  return {
    player:
      playerResult.data as DatabasePlayer,

    snapshots:
      snapshotsResult.data as PlayerSnapshot[],

    transfers:
      transfersResult.data as PlayerTransfer[],

    events:
      eventsResult.data as PlayerHistoryEvent[],
  };
}

/* =========================================================
   BUSCAR ID
========================================================= */

export async function findPlayerIdByEsmsIdentity(
  name: string,
  nationality: string
) {
  const supabase =
    getSupabaseAdmin();

  const {
    data,
    error,
  } =
    await supabase
      .from("players")
      .select(
        "id, esms_name, nationality"
      );

  if (
    error
  ) {
    throw error;
  }

  const targetKey =
    getPlayerIdentityKey(
      name,
      nationality
    );

  const found =
    data.find(
      (player) =>
        getPlayerIdentityKey(
          player.esms_name,
          player.nationality
        ) ===
        targetKey
    );

  return (
    found?.id ??
    null
  );
}

/* =========================================================
   MAPA IDS
========================================================= */

export async function getPlayerIdMap() {
  const supabase =
    getSupabaseAdmin();

  const {
    data,
    error,
  } =
    await supabase
      .from("players")
      .select(
        "id, esms_name, nationality"
      );

  if (
    error
  ) {
    throw error;
  }

  const map =
    new Map<
      string,
      string
    >();

  for (
    const player of data
  ) {
    map.set(
      getPlayerIdentityKey(
        player.esms_name,
        player.nationality
      ),
      player.id
    );
  }

  return map;
}