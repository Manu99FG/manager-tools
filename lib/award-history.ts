import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type HistoricalAwardResult = {
  pollId: string;
  seasonId: string;
  seasonName: string;
  title: string;
  awardKey: string;
  finalizedAt: string;
  playerId: string;
  playerName: string;
  teamCode: string | null;
  rank: number;
  points: number;
  votes: number;
  firstPlaces: number;
  secondPlaces: number;
  thirdPlaces: number;
};

export type HistoricalAwardPoll = {
  pollId: string;
  seasonId: string;
  seasonName: string;
  title: string;
  awardKey: string;
  finalizedAt: string;
  podium: HistoricalAwardResult[];
};

export type AwardPlayerRanking = {
  playerId: string;
  playerName: string;
  wins: number;
  podiums: number;
  totalPoints: number;
  awards: string[];
};

type HistoryRow = {
  poll_id: string;
  season_id: string;
  title: string;
  award_key: string;
  poll_finalized_at: string;
  player_id: string;
  team_code: string | null;
  rank: number | string;
  points: number | string;
  votes: number | string;
  first_places: number | string;
  second_places: number | string;
  third_places: number | string;
};

function n(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return 0;
}

async function hydrateRows(rows: HistoryRow[]): Promise<HistoricalAwardResult[]> {
  if (rows.length === 0) return [];

  const supabase = getSupabaseAdmin();
  const seasonIds = Array.from(new Set(rows.map((row) => row.season_id)));
  const playerIds = Array.from(new Set(rows.map((row) => row.player_id)));

  const [
    { data: seasonsData, error: seasonsError },
    { data: playersData, error: playersError },
  ] = await Promise.all([
    supabase.from("seasons").select("id,name").in("id", seasonIds),
    supabase.from("players").select("id,esms_name").in("id", playerIds),
  ]);

  if (seasonsError) throw seasonsError;
  if (playersError) throw playersError;

  const seasonMap = new Map(
    ((seasonsData ?? []) as Array<{ id: string; name: string }>).map((row) => [
      row.id,
      row.name,
    ])
  );

  const playerMap = new Map(
    ((playersData ?? []) as Array<{ id: string; esms_name: string }>).map((row) => [
      row.id,
      row.esms_name,
    ])
  );

  return rows.map((row) => ({
    pollId: row.poll_id,
    seasonId: row.season_id,
    seasonName: seasonMap.get(row.season_id) ?? "Temporada",
    title: row.title,
    awardKey: row.award_key,
    finalizedAt: row.poll_finalized_at,
    playerId: row.player_id,
    playerName: playerMap.get(row.player_id) ?? row.player_id,
    teamCode: row.team_code,
    rank: n(row.rank),
    points: n(row.points),
    votes: n(row.votes),
    firstPlaces: n(row.first_places),
    secondPlaces: n(row.second_places),
    thirdPlaces: n(row.third_places),
  }));
}

export async function getSeasonAwardHistory(
  seasonId: string
): Promise<HistoricalAwardPoll[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("award_history")
    .select("*")
    .eq("season_id", seasonId)
    .lte("rank", 3)
    .order("poll_finalized_at", { ascending: false })
    .order("rank", { ascending: true });

  if (error) throw error;

  const rows = await hydrateRows((data ?? []) as HistoryRow[]);
  return groupByPoll(rows);
}

export async function getPlayerAwardHistory(
  playerId: string
): Promise<HistoricalAwardResult[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("award_history")
    .select("*")
    .eq("player_id", playerId)
    .lte("rank", 3)
    .order("poll_finalized_at", { ascending: false });

  if (error) throw error;

  return hydrateRows((data ?? []) as HistoryRow[]);
}

export async function getGlobalAwardHistory(): Promise<{
  polls: HistoricalAwardPoll[];
  ranking: AwardPlayerRanking[];
}> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("award_history")
    .select("*")
    .lte("rank", 3)
    .order("poll_finalized_at", { ascending: false })
    .order("rank", { ascending: true });

  if (error) throw error;

  const rows = await hydrateRows((data ?? []) as HistoryRow[]);
  const rankingMap = new Map<string, AwardPlayerRanking>();

  for (const row of rows) {
    const current = rankingMap.get(row.playerId) ?? {
      playerId: row.playerId,
      playerName: row.playerName,
      wins: 0,
      podiums: 0,
      totalPoints: 0,
      awards: [],
    };

    if (row.rank === 1) {
      current.wins += 1;
      current.awards.push(`${row.title} · ${row.seasonName}`);
    }

    if (row.rank <= 3) current.podiums += 1;
    current.totalPoints += row.points;

    rankingMap.set(row.playerId, current);
  }

  const ranking = Array.from(rankingMap.values()).sort(
    (a, b) =>
      b.wins - a.wins ||
      b.podiums - a.podiums ||
      b.totalPoints - a.totalPoints ||
      a.playerName.localeCompare(b.playerName)
  );

  return {
    polls: groupByPoll(rows),
    ranking,
  };
}

function groupByPoll(rows: HistoricalAwardResult[]): HistoricalAwardPoll[] {
  const map = new Map<string, HistoricalAwardPoll>();

  for (const row of rows) {
    const current = map.get(row.pollId) ?? {
      pollId: row.pollId,
      seasonId: row.seasonId,
      seasonName: row.seasonName,
      title: row.title,
      awardKey: row.awardKey,
      finalizedAt: row.finalizedAt,
      podium: [],
    };

    current.podium.push(row);
    map.set(row.pollId, current);
  }

  return Array.from(map.values()).map((poll) => ({
    ...poll,
    podium: poll.podium.sort((a, b) => a.rank - b.rank),
  }));
}
