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

type SnapshotInsert = Omit<
  PlayerSnapshot,
  "id" | "created_at"
>;

const TRACKED_STATS = [
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

type TrackedStat =
  (typeof TRACKED_STATS)[number];

function normalizeName(
  name: string
) {
  return name
    .trim()
    .toLowerCase();
}

function normalizeNationality(
  nationality: string
) {
  return nationality
    .trim()
    .toLowerCase();
}

export async function findDatabasePlayer(
  player: GlobalEsmsPlayer
): Promise<
  DatabasePlayer | null
> {
  const supabase =
    getSupabaseAdmin();

  const {
    data,
    error,
  } = await supabase
    .from("players")
    .select("*")
    .eq(
      "esms_name",
      player.name
    )
    .eq(
      "nationality",
      player.nat
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createDatabasePlayer(
  player: GlobalEsmsPlayer
): Promise<DatabasePlayer> {
  const supabase =
    getSupabaseAdmin();

  const {
    data,
    error,
  } = await supabase
    .from("players")
    .insert({
      esms_name:
        player.name,

      nationality:
        player.nat,

      current_team_code:
        player.teamCode,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getOrCreateDatabasePlayer(
  player: GlobalEsmsPlayer
): Promise<DatabasePlayer> {
  const existing =
    await findDatabasePlayer(
      player
    );

  if (existing) {
    return existing;
  }

  return createDatabasePlayer(
    player
  );
}

export async function getLatestPlayerSnapshot(
  playerId: string
): Promise<
  PlayerSnapshot | null
> {
  const supabase =
    getSupabaseAdmin();

  const {
    data,
    error,
  } = await supabase
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
        ascending: false,
      }
    )
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

function buildSnapshot(
  playerId: string,
  player: GlobalEsmsPlayer
): SnapshotInsert {
  return {
    player_id:
      playerId,

    team_code:
      player.teamCode,

    snapshot_date:
      new Date().toISOString(),

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

function hasSnapshotChanged(
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

  return TRACKED_STATS.some(
    (stat) =>
      previous[stat] !==
      player[stat]
  );
}

async function registerTransfer(
  playerId: string,
  fromTeam:
    | string
    | null,
  toTeam: string
) {
  const supabase =
    getSupabaseAdmin();

  const {
    error,
  } = await supabase
    .from("transfers")
    .insert({
      player_id:
        playerId,

      from_team_code:
        fromTeam,

      to_team_code:
        toTeam,

      transfer_date:
        new Date().toISOString(),
    });

  if (error) {
    throw error;
  }
}

async function registerEvent(
  playerId: string,
  snapshotId: string,
  eventType: string,
  stat: string,
  oldValue: string,
  newValue: string
) {
  const supabase =
    getSupabaseAdmin();

  const {
    error,
  } = await supabase
    .from("player_events")
    .insert({
      player_id:
        playerId,

      snapshot_id:
        snapshotId,

      event_type:
        eventType,

      stat,

      old_value:
        oldValue,

      new_value:
        newValue,
    });

  if (error) {
    throw error;
  }
}

function getEventType(
  oldValue: number,
  newValue: number
) {
  if (
    newValue >
    oldValue
  ) {
    return "progression";
  }

  if (
    newValue <
    oldValue
  ) {
    return "regression";
  }

  return "unchanged";
}

async function registerSnapshotEvents(
  playerId: string,
  snapshotId: string,
  previous: PlayerSnapshot,
  player: GlobalEsmsPlayer
) {
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

    const eventType =
      getEventType(
        oldValue,
        newValue
      );

    await registerEvent(
      playerId,
      snapshotId,
      eventType,
      stat,
      String(oldValue),
      String(newValue)
    );
  }
}

async function updateCurrentTeam(
  playerId: string,
  teamCode: string
) {
  const supabase =
    getSupabaseAdmin();

  const {
    error,
  } = await supabase
    .from("players")
    .update({
      current_team_code:
        teamCode,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      playerId
    );

  if (error) {
    throw error;
  }
}

export async function savePlayerSnapshot(
  player: GlobalEsmsPlayer
) {
  const supabase =
    getSupabaseAdmin();

  const databasePlayer =
    await getOrCreateDatabasePlayer(
      player
    );

  const previous =
    await getLatestPlayerSnapshot(
      databasePlayer.id
    );

  if (
    previous &&
    !hasSnapshotChanged(
      previous,
      player
    )
  ) {
    return {
      status:
        "unchanged" as const,

      playerId:
        databasePlayer.id,
    };
  }

  const snapshot =
    buildSnapshot(
      databasePlayer.id,
      player
    );

  const {
    data: createdSnapshot,
    error,
  } = await supabase
    .from(
      "player_snapshots"
    )
    .insert(snapshot)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  if (
    previous &&
    previous.team_code !==
      player.teamCode
  ) {
    await registerTransfer(
      databasePlayer.id,
      previous.team_code,
      player.teamCode
    );
  }

  if (previous) {
    await registerSnapshotEvents(
      databasePlayer.id,
      createdSnapshot.id,
      previous,
      player
    );
  }

  await updateCurrentTeam(
    databasePlayer.id,
    player.teamCode
  );

  return {
    status:
      "saved" as const,

    playerId:
      databasePlayer.id,

    snapshotId:
      createdSnapshot.id,
  };
}

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
        .from("transfers")
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

export async function findPlayerIdByEsmsIdentity(
  name: string,
  nationality: string
) {
  const supabase =
    getSupabaseAdmin();

  const normalizedName =
    normalizeName(name);

  const normalizedNationality =
    normalizeNationality(
      nationality
    );

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

  const result =
    data.find(
      (player) =>
        normalizeName(
          player.esms_name
        ) ===
          normalizedName &&
        normalizeNationality(
          player.nationality
        ) ===
          normalizedNationality
    );

  return (
    result?.id ?? null
  );
}