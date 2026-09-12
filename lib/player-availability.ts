import {
  getSupabaseAdmin,
} from "@/lib/supabase-admin";

export type PlayerAvailabilityStatus =
  | "AVAILABLE"
  | "INJURED"
  | "SUSPENDED"
  | "INJURED_AND_SUSPENDED";

export type PlayerAvailabilityRow = {
  playerId: string;
  esmsName: string;
  nationality: string;
  teamCode: string;

  injuryMatches: number;
  suspensionMatches: number;
  disciplinaryPoints: number;
  fitness: number;

  status:
    PlayerAvailabilityStatus;

  snapshotDate:
    string | null;

  recentInjuryMatchId:
    string | null;

  recentInjuryAt:
    string | null;
};

export type TeamAvailabilitySummary = {
  teamCode: string;
  totalPlayers: number;
  available: number;
  injured: number;
  suspended: number;
  unavailable: number;
};

export type AvailabilityData = {
  players:
    PlayerAvailabilityRow[];

  unavailable:
    PlayerAvailabilityRow[];

  injured:
    PlayerAvailabilityRow[];

  suspended:
    PlayerAvailabilityRow[];

  recentInjuries:
    PlayerAvailabilityRow[];

  teams:
    TeamAvailabilitySummary[];

  totals: {
    players: number;
    available: number;
    injured: number;
    suspended: number;
    unavailable: number;
  };
};

type DatabasePlayer = {
  id: string;
  esms_name: string;
  nationality: string;
  current_team_code:
    string | null;
};

type SnapshotRow = {
  id: string;
  player_id: string;
  team_code: string;
  inj: number;
  sus: number;
  dp: number;
  fit: number;
  snapshot_date: string;
};

type InjuryStatRow = {
  player_id: string | null;
  match_id: string;
  team_code: string;
  injury: number;
  imported_at: string;
};

function normalizeNumber(
  value: unknown
) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
}

function getStatus(
  inj: number,
  sus: number
): PlayerAvailabilityStatus {
  if (
    inj > 0 &&
    sus > 0
  ) {
    return "INJURED_AND_SUSPENDED";
  }

  if (inj > 0) {
    return "INJURED";
  }

  if (sus > 0) {
    return "SUSPENDED";
  }

  return "AVAILABLE";
}

export function isPlayerUnavailable(
  player:
    Pick<
      PlayerAvailabilityRow,
      | "injuryMatches"
      | "suspensionMatches"
    >
) {
  return (
    player.injuryMatches >
      0 ||
    player.suspensionMatches >
      0
  );
}

export async function getPlayerAvailability(): Promise<
  AvailabilityData
> {
  const supabase =
    getSupabaseAdmin();

  const [
    playersResult,
    snapshotsResult,
    injuryStatsResult,
  ] =
    await Promise.all([
      supabase
        .from("players")
        .select(
          "id, esms_name, nationality, current_team_code"
        ),

      supabase
        .from(
          "player_snapshots"
        )
        .select(
          "id, player_id, team_code, inj, sus, dp, fit, snapshot_date"
        )
        .order(
          "snapshot_date",
          {
            ascending: false,
          }
        ),

      supabase
        .from(
          "match_player_stats"
        )
        .select(
          "player_id, match_id, team_code, injury, imported_at"
        )
        .eq(
          "injury",
          1
        )
        .order(
          "imported_at",
          {
            ascending: false,
          }
        ),
    ]);

  if (
    playersResult.error
  ) {
    throw playersResult.error;
  }

  if (
    snapshotsResult.error
  ) {
    throw snapshotsResult.error;
  }

  if (
    injuryStatsResult.error
  ) {
    throw injuryStatsResult.error;
  }

  const players =
    (playersResult.data ??
      []) as DatabasePlayer[];

  const snapshots =
    (snapshotsResult.data ??
      []) as SnapshotRow[];

  const injuryStats =
    (injuryStatsResult.data ??
      []) as InjuryStatRow[];

  /*
   * Snapshot canónico actual:
   * la consulta viene ordenada
   * descendente por snapshot_date,
   * así que conservamos la primera
   * aparición de cada player_id.
   */
  const latestSnapshotByPlayer =
    new Map<
      string,
      SnapshotRow
    >();

  for (
    const snapshot of
      snapshots
  ) {
    if (
      !latestSnapshotByPlayer.has(
        snapshot.player_id
      )
    ) {
      latestSnapshotByPlayer.set(
        snapshot.player_id,
        snapshot
      );
    }
  }

  /*
   * Última lesión detectada
   * directamente en un .stt.
   * Esto NO inventa la duración:
   * la duración canónica es inj
   * en el snapshot/roster.
   */
  const recentInjuryByPlayer =
    new Map<
      string,
      InjuryStatRow
    >();

  for (
    const injury of
      injuryStats
  ) {
    if (
      !injury.player_id
    ) {
      continue;
    }

    if (
      !recentInjuryByPlayer.has(
        injury.player_id
      )
    ) {
      recentInjuryByPlayer.set(
        injury.player_id,
        injury
      );
    }
  }

  const rows:
    PlayerAvailabilityRow[] =
    [];

  for (
    const player of players
  ) {
    const snapshot =
      latestSnapshotByPlayer.get(
        player.id
      );

    if (!snapshot) {
      continue;
    }

    const injuryMatches =
      normalizeNumber(
        snapshot.inj
      );

    const suspensionMatches =
      normalizeNumber(
        snapshot.sus
      );

    const recentInjury =
      recentInjuryByPlayer.get(
        player.id
      );

    rows.push({
      playerId:
        player.id,

      esmsName:
        player.esms_name,

      nationality:
        player.nationality,

      teamCode:
        (
          player.current_team_code ??
          snapshot.team_code
        ).toUpperCase(),

      injuryMatches,

      suspensionMatches,

      disciplinaryPoints:
        normalizeNumber(
          snapshot.dp
        ),

      fitness:
        normalizeNumber(
          snapshot.fit
        ),

      status:
        getStatus(
          injuryMatches,
          suspensionMatches
        ),

      snapshotDate:
        snapshot.snapshot_date ??
        null,

      recentInjuryMatchId:
        recentInjury?.match_id ??
        null,

      recentInjuryAt:
        recentInjury?.imported_at ??
        null,
    });
  }

  rows.sort(
    (
      a,
      b
    ) =>
      a.teamCode.localeCompare(
        b.teamCode
      ) ||
      a.esmsName.localeCompare(
        b.esmsName
      )
  );

  const unavailable =
    rows.filter(
      isPlayerUnavailable
    );

  const injured =
    rows.filter(
      (row) =>
        row.injuryMatches >
        0
    );

  const suspended =
    rows.filter(
      (row) =>
        row.suspensionMatches >
        0
    );

  const recentInjuries =
    rows
      .filter(
        (row) =>
          Boolean(
            row.recentInjuryMatchId
          )
      )
      .sort(
        (
          a,
          b
        ) =>
          new Date(
            b.recentInjuryAt ??
              0
          ).getTime() -
          new Date(
            a.recentInjuryAt ??
              0
          ).getTime()
      );

  const teamMap =
    new Map<
      string,
      TeamAvailabilitySummary
    >();

  for (
    const row of rows
  ) {
    const summary =
      teamMap.get(
        row.teamCode
      ) ?? {
        teamCode:
          row.teamCode,
        totalPlayers: 0,
        available: 0,
        injured: 0,
        suspended: 0,
        unavailable: 0,
      };

    summary.totalPlayers +=
      1;

    if (
      row.injuryMatches >
      0
    ) {
      summary.injured +=
        1;
    }

    if (
      row.suspensionMatches >
      0
    ) {
      summary.suspended +=
        1;
    }

    if (
      isPlayerUnavailable(
        row
      )
    ) {
      summary.unavailable +=
        1;
    } else {
      summary.available +=
        1;
    }

    teamMap.set(
      row.teamCode,
      summary
    );
  }

  const teams =
    Array.from(
      teamMap.values()
    ).sort(
      (
        a,
        b
      ) =>
        b.unavailable -
          a.unavailable ||
        a.teamCode.localeCompare(
          b.teamCode
        )
    );

  return {
    players:
      rows,

    unavailable,
    injured,
    suspended,
    recentInjuries,

    teams,

    totals: {
      players:
        rows.length,

      available:
        rows.length -
        unavailable.length,

      injured:
        injured.length,

      suspended:
        suspended.length,

      unavailable:
        unavailable.length,
    },
  };
}

export async function getTeamUnavailablePlayers(
  teamCode: string
) {
  const data =
    await getPlayerAvailability();

  const normalized =
    teamCode.toUpperCase();

  return data.unavailable.filter(
    (player) =>
      player.teamCode ===
      normalized
  );
}

export async function getUnavailablePlayerIds() {
  const data =
    await getPlayerAvailability();

  return new Set(
    data.unavailable.map(
      (player) =>
        player.playerId
    )
  );
}
