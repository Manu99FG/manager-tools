import type {
  GlobalEsmsPlayer,
} from "@/lib/all-players";

import {
  getSupabaseAdmin,
} from "@/lib/supabase-admin";

import type {
  DatabasePlayer,
  PlayerHistoryEvent,
  PlayerSnapshot,
  PlayerTransfer,
} from "@/lib/player-history-types";

/* =========================================================
   ESTADÍSTICAS QUE VIGILAMOS
========================================================= */

export const TRACKED_STATS = [
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

  if (
    previous.age !==
    player.age
  ) {
    return true;
  }

  if (
    previous.ag !==
    player.ag
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

  /*
   * Para medias/EXP sí hablamos de
   * progresión/regresión.
   */
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

  /*
   * Para estadísticas, lesiones,
   * sanciones, etc. es simplemente
   * un cambio.
   */
  return "stat_change";
}

/* =========================================================
   DATOS DE PÁGINA DEL JUGADOR
========================================================= */

export async function getPlayerPageData(
  playerId: string
) {
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
   BUSCAR ID DE JUGADOR
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
  } = await supabase
    .from("players")
    .select(
      "id, esms_name, nationality"
    );

  if (error) {
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
   MAPA GLOBAL DE IDS
========================================================= */

export async function getPlayerIdMap() {
  const supabase =
    getSupabaseAdmin();

  const {
    data,
    error,
  } = await supabase
    .from("players")
    .select(
      "id, esms_name, nationality"
    );

  if (error) {
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