import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type AwardNomineePosition = "GK" | "DF" | "DM" | "MF" | "AM" | "FW";

export type AwardNominee = {
  playerId: string;
  esmsName: string;
  teamCode: string;
  position: AwardNomineePosition | null;
  age: number | null;
  appearances: number;
  minutes: number;
  goals: number;
  assists: number;
  mom: number;
  saves: number;
  conceded: number;
  tackles: number;
  keyPasses: number;
  shots: number;
  dp: number;
  score: number;
  reason: string;
};

type RawStat = {
  player_id: string | null;
  esms_name: string;
  team_code: string;
  participated: number | null;
  minutes: number | null;
  mom: number | null;
  saves: number | null;
  conceded: number | null;
  tackles: number | null;
  key_passes: number | null;
  shots: number | null;
  goals: number | null;
  assists: number | null;
  dp: number | null;
  position_at_match: string | null;
  age_at_match: number | null;
};

type Aggregate = Omit<AwardNominee, "score" | "reason"> & {
  teamMinutes: Map<string, number>;
  positionMinutes: Map<AwardNomineePosition, number>;
  ages: number[];
};

const POSITIONS: AwardNomineePosition[] = ["GK", "DF", "DM", "MF", "AM", "FW"];
const MATCH_CHUNK = 10;

function n(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return 0;
}

function normalizePosition(value: unknown): AwardNomineePosition | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return POSITIONS.includes(normalized as AwardNomineePosition)
    ? (normalized as AwardNomineePosition)
    : null;
}

function dominant<K extends string>(map: Map<K, number>): K | null {
  let best: K | null = null;
  let bestValue = -1;

  for (const [key, value] of map.entries()) {
    if (value > bestValue) {
      best = key;
      bestValue = value;
    }
  }

  return best;
}

function per90(value: number, minutes: number) {
  return minutes > 0 ? (value * 90) / minutes : 0;
}

function pct(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0;
}

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function confidence(minutes: number) {
  // Reduce el impacto de muestras diminutas sin exigir una temporada completa.
  return Math.min(1, Math.max(0.35, minutes / 900));
}

function commonScore(player: Aggregate) {
  return (
    player.goals * 6 +
    player.assists * 4.5 +
    player.mom * 8 +
    player.keyPasses * 0.35 +
    player.tackles * 0.22 +
    player.saves * 0.08 +
    player.minutes / 180 -
    player.dp * 0.12
  );
}

function scorePlayer(player: Aggregate, awardKey: string) {
  const factor = confidence(player.minutes);
  const savePct = pct(player.saves, player.saves + player.conceded);
  const goals90 = per90(player.goals, player.minutes);
  const assists90 = per90(player.assists, player.minutes);
  const tackles90 = per90(player.tackles, player.minutes);
  const keyPasses90 = per90(player.keyPasses, player.minutes);
  const saves90 = per90(player.saves, player.minutes);
  const conceded90 = per90(player.conceded, player.minutes);
  const conversion = pct(player.goals, player.shots);

  switch (awardKey) {
    case "GK":
      return (
        (
          player.saves * 0.95 +
          saves90 * 7 +
          savePct * 0.35 -
          player.conceded * 0.55 -
          conceded90 * 6 +
          player.mom * 9 +
          player.minutes / 180
        ) * factor
      );

    case "DF":
      return (
        (
          player.tackles * 1.15 +
          tackles90 * 5 +
          player.keyPasses * 0.3 +
          player.assists * 3 +
          player.goals * 5 +
          player.mom * 8 +
          player.minutes / 180 -
          player.dp * 0.18
        ) * factor
      );

    case "MF":
      return (
        (
          player.keyPasses * 0.9 +
          keyPasses90 * 4 +
          player.assists * 5 +
          assists90 * 10 +
          player.goals * 4.5 +
          player.tackles * 0.28 +
          player.mom * 8 +
          player.minutes / 180 -
          player.dp * 0.12
        ) * factor
      );

    case "FW":
      return (
        (
          player.goals * 7 +
          goals90 * 16 +
          player.assists * 4 +
          player.shots * 0.12 +
          conversion * 0.18 +
          player.mom * 8 +
          player.minutes / 180
        ) * factor
      );

    case "YOUNG":
      return commonScore(player) * factor;

    case "MVP":
      return (
        commonScore(player) +
        per90(player.goals + player.assists, player.minutes) * 12 +
        player.mom * 2
      ) * factor;

    case "BALLON_DOR":
    default:
      return (
        commonScore(player) +
        per90(player.goals + player.assists, player.minutes) * 10 +
        player.mom * 3
      ) * factor;
  }
}

function eligible(player: Aggregate, awardKey: string) {
  if (player.appearances < 2 || player.minutes <= 0) return false;

  switch (awardKey) {
    case "GK":
      return player.position === "GK";
    case "DF":
      return player.position === "DF";
    case "MF":
      return (
        player.position === "DM" ||
        player.position === "MF" ||
        player.position === "AM"
      );
    case "FW":
      return player.position === "FW";
    case "YOUNG":
      return player.age !== null && player.age <= 21;
    default:
      return true;
  }
}

function reason(player: Aggregate, awardKey: string) {
  const pieces: string[] = [];

  switch (awardKey) {
    case "GK": {
      const savePct = pct(player.saves, player.saves + player.conceded);
      pieces.push(`${player.saves} paradas`);
      pieces.push(`${round(savePct, 1)}% paradas`);
      pieces.push(`${round(per90(player.conceded, player.minutes), 2)} GC/90`);
      if (player.mom) pieces.push(`${player.mom} MVP`);
      break;
    }

    case "DF":
      pieces.push(`${player.tackles} KTK`);
      pieces.push(`${round(per90(player.tackles, player.minutes), 2)} KTK/90`);
      if (player.goals + player.assists) {
        pieces.push(`${player.goals + player.assists} G+A`);
      }
      if (player.mom) pieces.push(`${player.mom} MVP`);
      break;

    case "MF":
      pieces.push(`${player.keyPasses} KPS`);
      pieces.push(`${player.assists} asist.`);
      if (player.goals) pieces.push(`${player.goals} goles`);
      if (player.mom) pieces.push(`${player.mom} MVP`);
      break;

    case "FW":
      pieces.push(`${player.goals} goles`);
      pieces.push(`${round(per90(player.goals, player.minutes), 2)} G/90`);
      if (player.assists) pieces.push(`${player.assists} asist.`);
      if (player.mom) pieces.push(`${player.mom} MVP`);
      break;

    case "YOUNG":
      if (player.age !== null) pieces.push(`${player.age} años`);
      pieces.push(`${player.goals} G`);
      pieces.push(`${player.assists} A`);
      if (player.mom) pieces.push(`${player.mom} MVP`);
      break;

    default:
      pieces.push(`${player.goals} G`);
      pieces.push(`${player.assists} A`);
      pieces.push(`${player.mom} MVP`);
      pieces.push(`${player.minutes} min`);
  }

  return pieces.slice(0, 4).join(" · ");
}

async function getLatestAgeMap(playerIds: string[]) {
  if (playerIds.length === 0) return new Map<string, number>();

  const supabase = getSupabaseAdmin();
  const map = new Map<string, number>();

  for (let index = 0; index < playerIds.length; index += 200) {
    const chunk = playerIds.slice(index, index + 200);

    const { data, error } = await supabase
      .from("latest_player_snapshots")
      .select("player_id,age")
      .in("player_id", chunk);

    if (error) throw error;

    for (const row of (data ?? []) as Array<{ player_id: string; age: number | null }>) {
      if (row.age !== null && Number.isFinite(Number(row.age))) {
        map.set(row.player_id, Number(row.age));
      }
    }
  }

  return map;
}

export async function getAutomaticAwardNominees(
  seasonId: string,
  awardKey: string,
  limit = 10
): Promise<AwardNominee[]> {
  const supabase = getSupabaseAdmin();

  const { data: competitionsData, error: competitionsError } = await supabase
    .from("competitions")
    .select("id")
    .eq("season_id", seasonId);

  if (competitionsError) throw competitionsError;

  const competitionIds = (competitionsData ?? []).map((row) => String(row.id));
  if (competitionIds.length === 0) return [];

  const { data: matchesData, error: matchesError } = await supabase
    .from("matches")
    .select("id")
    .in("competition_id", competitionIds)
    .eq("status", "PLAYED");

  if (matchesError) throw matchesError;

  const matchIds = (matchesData ?? []).map((row) => String(row.id));
  if (matchIds.length === 0) return [];

  const stats: RawStat[] = [];

  // 10 partidos por consulta evita que una jornada/competición grande vuelva
  // a tropezar con el límite de 1000 filas de PostgREST.
  for (let index = 0; index < matchIds.length; index += MATCH_CHUNK) {
    const chunk = matchIds.slice(index, index + MATCH_CHUNK);

    const { data, error } = await supabase
      .from("match_player_stats")
      .select(
        "player_id,esms_name,team_code,participated,minutes,mom,saves,conceded,tackles,key_passes,shots,goals,assists,dp,position_at_match,age_at_match"
      )
      .in("match_id", chunk);

    if (error) throw error;

    stats.push(...((data ?? []) as RawStat[]));
  }

  const aggregates = new Map<string, Aggregate>();

  for (const row of stats) {
    if (!row.player_id) continue;

    const key = row.player_id;
    const minutes = n(row.minutes);
    const teamCode = String(row.team_code ?? "").toUpperCase();
    const position = normalizePosition(row.position_at_match);

    const current =
      aggregates.get(key) ??
      ({
        playerId: row.player_id,
        esmsName: row.esms_name,
        teamCode,
        position: null,
        age: null,
        appearances: 0,
        minutes: 0,
        goals: 0,
        assists: 0,
        mom: 0,
        saves: 0,
        conceded: 0,
        tackles: 0,
        keyPasses: 0,
        shots: 0,
        dp: 0,
        teamMinutes: new Map<string, number>(),
        positionMinutes: new Map<AwardNomineePosition, number>(),
        ages: [],
      } satisfies Aggregate);

    current.esmsName = row.esms_name;
    current.appearances += n(row.participated) > 0 || minutes > 0 ? 1 : 0;
    current.minutes += minutes;
    current.goals += n(row.goals);
    current.assists += n(row.assists);
    current.mom += n(row.mom);
    current.saves += n(row.saves);
    current.conceded += n(row.conceded);
    current.tackles += n(row.tackles);
    current.keyPasses += n(row.key_passes);
    current.shots += n(row.shots);
    current.dp += n(row.dp);

    if (teamCode) {
      current.teamMinutes.set(
        teamCode,
        (current.teamMinutes.get(teamCode) ?? 0) + Math.max(1, minutes)
      );
    }

    if (position) {
      current.positionMinutes.set(
        position,
        (current.positionMinutes.get(position) ?? 0) + Math.max(1, minutes)
      );
    }

    if (row.age_at_match !== null && Number.isFinite(Number(row.age_at_match))) {
      current.ages.push(Number(row.age_at_match));
    }

    aggregates.set(key, current);
  }

  const latestAgeMap = await getLatestAgeMap(Array.from(aggregates.keys()));

  const players = Array.from(aggregates.values()).map((player) => {
    player.teamCode = dominant(player.teamMinutes) ?? player.teamCode;
    player.position = dominant(player.positionMinutes);
    player.age =
      player.ages.length > 0
        ? Math.max(...player.ages)
        : latestAgeMap.get(player.playerId) ?? null;
    return player;
  });

  return players
    .filter((player) => eligible(player, awardKey))
    .map((player) => ({
      playerId: player.playerId,
      esmsName: player.esmsName,
      teamCode: player.teamCode,
      position: player.position,
      age: player.age,
      appearances: player.appearances,
      minutes: player.minutes,
      goals: player.goals,
      assists: player.assists,
      mom: player.mom,
      saves: player.saves,
      conceded: player.conceded,
      tackles: player.tackles,
      keyPasses: player.keyPasses,
      shots: player.shots,
      dp: player.dp,
      score: round(scorePlayer(player, awardKey), 3),
      reason: reason(player, awardKey),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.minutes - a.minutes ||
        a.esmsName.localeCompare(b.esmsName)
    )
    .slice(0, limit);
}
