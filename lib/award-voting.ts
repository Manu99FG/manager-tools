import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type AwardPollStatus = "DRAFT" | "OPEN" | "CLOSED";

export type AwardPoll = {
  id: string;
  season_id: string;
  title: string;
  award_key: string;
  description: string | null;
  status: AwardPollStatus;
  max_rank: number;
  points_first: number;
  points_second: number;
  points_third: number;
  show_live_results: boolean;
  opens_at: string | null;
  closes_at: string | null;
  created_at: string;
  updated_at: string;
  finalized_at: string | null;
};

export type AwardCandidate = {
  id: string;
  poll_id: string;
  player_id: string;
  team_code: string | null;
  sort_order: number;
  nomination_score: number | null;
  nomination_reason: string | null;
  created_at: string;
  playerName: string;
};

export type AwardResult = {
  candidateId: string;
  playerId: string;
  playerName: string;
  teamCode: string | null;
  points: number;
  votes: number;
  firstPlaces: number;
  secondPlaces: number;
  thirdPlaces: number;
};

export type AwardPollSummary = AwardPoll & {
  seasonName: string;
  candidateCount: number;
  ballotCount: number;
  winner: AwardResult | null;
};

export type AwardPollDetail = AwardPollSummary & {
  candidates: AwardCandidate[];
  results: AwardResult[];
  canShowResults: boolean;
};

type PlayerMini = {
  id: string;
  esms_name: string;
};

function sortResults(rows: AwardResult[]) {
  return [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      b.firstPlaces - a.firstPlaces ||
      b.secondPlaces - a.secondPlaces ||
      b.thirdPlaces - a.thirdPlaces ||
      a.playerName.localeCompare(b.playerName)
  );
}

async function getPlayerMap(playerIds: string[]) {
  if (playerIds.length === 0) return new Map<string, string>();

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("players")
    .select("id,esms_name")
    .in("id", playerIds);

  if (error) throw error;

  return new Map(
    ((data ?? []) as PlayerMini[]).map((row) => [row.id, row.esms_name])
  );
}

export async function getAwardPolls(): Promise<AwardPollSummary[]> {
  const supabase = getSupabaseAdmin();

  const [
    { data: pollsData, error: pollsError },
    { data: seasonsData, error: seasonsError },
    { data: candidatesData, error: candidatesError },
    { data: ballotsData, error: ballotsError },
    { data: resultsData, error: resultsError },
  ] = await Promise.all([
    supabase
      .from("award_polls")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("seasons").select("id,name"),
    supabase.from("award_candidates").select("id,poll_id,player_id,team_code"),
    supabase.from("award_ballots").select("id,poll_id"),
    supabase.from("award_poll_results").select("*"),
  ]);

  if (pollsError) throw pollsError;
  if (seasonsError) throw seasonsError;
  if (candidatesError) throw candidatesError;
  if (ballotsError) throw ballotsError;
  if (resultsError) throw resultsError;

  const polls = (pollsData ?? []) as AwardPoll[];
  const seasons = new Map(
    ((seasonsData ?? []) as Array<{ id: string; name: string }>).map((row) => [
      row.id,
      row.name,
    ])
  );

  const candidates = (candidatesData ?? []) as Array<{
    id: string;
    poll_id: string;
    player_id: string;
    team_code: string | null;
  }>;

  const playerMap = await getPlayerMap(
    Array.from(new Set(candidates.map((row) => row.player_id)))
  );

  const resultsByPoll = new Map<string, AwardResult[]>();

  for (const row of (resultsData ?? []) as Array<{
    poll_id: string;
    candidate_id: string;
    player_id: string;
    team_code: string | null;
    points: number | string;
    votes: number | string;
    first_places: number | string;
    second_places: number | string;
    third_places: number | string;
  }>) {
    const result: AwardResult = {
      candidateId: row.candidate_id,
      playerId: row.player_id,
      playerName: playerMap.get(row.player_id) ?? row.player_id,
      teamCode: row.team_code,
      points: Number(row.points ?? 0),
      votes: Number(row.votes ?? 0),
      firstPlaces: Number(row.first_places ?? 0),
      secondPlaces: Number(row.second_places ?? 0),
      thirdPlaces: Number(row.third_places ?? 0),
    };

    const current = resultsByPoll.get(row.poll_id) ?? [];
    current.push(result);
    resultsByPoll.set(row.poll_id, current);
  }

  const candidateCounts = new Map<string, number>();
  for (const row of candidates) {
    candidateCounts.set(
      row.poll_id,
      (candidateCounts.get(row.poll_id) ?? 0) + 1
    );
  }

  const ballotCounts = new Map<string, number>();
  for (const row of (ballotsData ?? []) as Array<{ id: string; poll_id: string }>) {
    ballotCounts.set(row.poll_id, (ballotCounts.get(row.poll_id) ?? 0) + 1);
  }

  return polls.map((poll) => {
    const results = sortResults(resultsByPoll.get(poll.id) ?? []);

    return {
      ...poll,
      seasonName: seasons.get(poll.season_id) ?? "Temporada",
      candidateCount: candidateCounts.get(poll.id) ?? 0,
      ballotCount: ballotCounts.get(poll.id) ?? 0,
      winner:
        poll.status === "CLOSED" && (results[0]?.votes ?? 0) > 0
          ? results[0]
          : null,
    };
  });
}

export async function getAwardPollDetail(
  pollId: string
): Promise<AwardPollDetail | null> {
  const supabase = getSupabaseAdmin();

  const { data: pollData, error: pollError } = await supabase
    .from("award_polls")
    .select("*")
    .eq("id", pollId)
    .maybeSingle();

  if (pollError) throw pollError;
  if (!pollData) return null;

  const poll = pollData as AwardPoll;

  const [
    { data: seasonData, error: seasonError },
    { data: candidatesData, error: candidatesError },
    { data: ballotsData, error: ballotsError },
    { data: resultsData, error: resultsError },
  ] = await Promise.all([
    supabase
      .from("seasons")
      .select("id,name")
      .eq("id", poll.season_id)
      .maybeSingle(),
    supabase
      .from("award_candidates")
      .select("*")
      .eq("poll_id", pollId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("award_ballots").select("id").eq("poll_id", pollId),
    supabase.from("award_poll_results").select("*").eq("poll_id", pollId),
  ]);

  if (seasonError) throw seasonError;
  if (candidatesError) throw candidatesError;
  if (ballotsError) throw ballotsError;
  if (resultsError) throw resultsError;

  const rawCandidates = (candidatesData ?? []) as Array<{
    id: string;
    poll_id: string;
    player_id: string;
    team_code: string | null;
    sort_order: number;
    nomination_score: number | null;
    nomination_reason: string | null;
    created_at: string;
  }>;

  const playerMap = await getPlayerMap(
    Array.from(new Set(rawCandidates.map((row) => row.player_id)))
  );

  const candidates: AwardCandidate[] = rawCandidates.map((row) => ({
    ...row,
    playerName: playerMap.get(row.player_id) ?? row.player_id,
  }));

  const results = sortResults(
    ((resultsData ?? []) as Array<{
      candidate_id: string;
      player_id: string;
      team_code: string | null;
      points: number | string;
      votes: number | string;
      first_places: number | string;
      second_places: number | string;
      third_places: number | string;
    }>).map((row) => ({
      candidateId: row.candidate_id,
      playerId: row.player_id,
      playerName: playerMap.get(row.player_id) ?? row.player_id,
      teamCode: row.team_code,
      points: Number(row.points ?? 0),
      votes: Number(row.votes ?? 0),
      firstPlaces: Number(row.first_places ?? 0),
      secondPlaces: Number(row.second_places ?? 0),
      thirdPlaces: Number(row.third_places ?? 0),
    }))
  );

  const canShowResults =
    poll.status === "CLOSED" || poll.show_live_results;

  return {
    ...poll,
    seasonName:
      (seasonData as { id: string; name: string } | null)?.name ?? "Temporada",
    candidateCount: candidates.length,
    ballotCount: (ballotsData ?? []).length,
    winner:
      poll.status === "CLOSED" && (results[0]?.votes ?? 0) > 0
        ? results[0]
        : null,
    candidates,
    results,
    canShowResults,
  };
}

export async function getSeasonAwardPolls(seasonId: string) {
  const polls = await getAwardPolls();
  return polls.filter((poll) => poll.season_id === seasonId);
}
