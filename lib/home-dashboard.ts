import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCompetitions, getCompetitionPageData } from "@/lib/competitions";
import { getMarketHistoryData } from "@/lib/market-history";
import { getClubName } from "@/lib/club-names";

export type HomeCompetitionOption = {
  id: string;
  name: string;
  type: string;
  status: string;
  seasonName: string | null;
};

export type HomeResult = {
  id: string;
  homeTeamCode: string;
  awayTeamCode: string;
  homeScore: number;
  awayScore: number;
  playedAt: string | null;
};

export type HomeStanding = {
  position: number;
  teamCode: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalDifference: number;
  points: number;
};

export type HomeTransfer = {
  id: string;
  playerId: string;
  playerName: string;
  fromTeamCode: string | null;
  toTeamCode: string | null;
  movementType: string;
  transferDate: string;
  fee: number | null;
  photoUrl: string | null;
};

export type HomeFeaturedPlayer = {
  playerId: string | null;
  esmsName: string;
  displayName: string;
  teamCode: string;
  position: string;
  appearances: number;
  minutes: number;
  goals: number;
  assists: number;
  mom: number;
  tackles: number;
  keyPasses: number;
  saves: number;
  conceded: number;
  score: number;
  photoUrl: string | null;
};

export type HomeCompetitionData = {
  competition: HomeCompetitionOption;
  results: HomeResult[];
  standings: HomeStanding[];
  featuredByPosition: Record<string, HomeFeaturedPlayer[]>;
};

export type HomeDashboardData = {
  totals: {
    clubs: number;
    players: number;
    competitions: number;
    movements: number;
  };
  latestTransfers: HomeTransfer[];
  competitions: HomeCompetitionOption[];
  byCompetition: Record<string, HomeCompetitionData>;
};

type StatRow = {
  player_id: string | null;
  esms_name: string;
  team_code: string;
  position_at_match: string | null;
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
  matches:
    | { competition_id: string }
    | { competition_id: string }[]
    | null;
};

type PlayerRow = {
  id: string;
  esms_name: string;
  full_name: string | null;
  photo_url: string | null;
  current_team_code: string | null;
};

const POSITIONS = ["GK", "DF", "DM", "MF", "AM", "FW"] as const;
const PAGE_SIZE = 1000;

function normalizePosition(value: string | null): string | null {
  const position = value?.toUpperCase().trim() ?? "";
  return POSITIONS.includes(position as (typeof POSITIONS)[number])
    ? position
    : null;
}

function performanceScore(position: string, row: HomeFeaturedPlayer) {
  if (position === "GK") {
    return 6 * row.saves - 5 * row.conceded + 0.2 * row.minutes + 2 * row.mom;
  }
  if (position === "DF") {
    return 4 * row.tackles + 2 * row.keyPasses + 2 * row.assists + 3 * row.goals + 2 * row.mom;
  }
  if (position === "DM") {
    return 4 * row.tackles + 3 * row.keyPasses + 2 * row.assists + row.goals + 2 * row.mom;
  }
  if (position === "MF") {
    return 4 * row.keyPasses + 3 * row.assists + 2 * row.goals + 2 * row.mom;
  }
  if (position === "AM") {
    return 5 * row.goals + 4 * row.assists + 2 * row.keyPasses + 2 * row.mom;
  }
  return 6 * row.goals + 2 * row.assists + row.keyPasses + 2 * row.mom;
}

async function getAllStats(): Promise<StatRow[]> {
  const supabase = getSupabaseAdmin();
  const rows: StatRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("match_player_stats")
      .select(`
        player_id,
        esms_name,
        team_code,
        position_at_match,
        participated,
        minutes,
        mom,
        saves,
        conceded,
        tackles,
        key_passes,
        shots,
        goals,
        assists,
        dp,
        matches!inner (
          competition_id
        )
      `)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    const page = (data ?? []) as unknown as StatRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

export async function getHomeDashboardData(): Promise<HomeDashboardData> {
  const supabase = getSupabaseAdmin();

  const [competitions, market, stats, playersResult, clubsResult] = await Promise.all([
    getCompetitions(),
    getMarketHistoryData(),
    getAllStats(),
    supabase
      .from("players")
      .select("id,esms_name,full_name,photo_url,current_team_code"),
    supabase
      .from("club_metadata")
      .select("club_code", { count: "exact", head: true }),
  ]);

  if (playersResult.error) throw playersResult.error;
  if (clubsResult.error) throw clubsResult.error;

  const players = (playersResult.data ?? []) as PlayerRow[];
  const playerById = new Map(players.map((player) => [player.id, player]));
  const currentPlayers = players.filter((player) => player.current_team_code !== null);

  const options: HomeCompetitionOption[] = competitions.map((competition) => ({
    id: competition.id,
    name: competition.name,
    type: competition.type,
    status: competition.status,
    seasonName: competition.season?.name ?? null,
  }));

  const pageData = await Promise.all(
    competitions.map(async (competition) => {
      const data = await getCompetitionPageData(competition.id);
      return [competition.id, data] as const;
    })
  );

  const pageDataMap = new Map(pageData);

  const byCompetition: Record<string, HomeCompetitionData> = {};

  for (const competition of options) {
    const data = pageDataMap.get(competition.id);

    const results: HomeResult[] = (data?.matches ?? [])
      .filter(
        (match) =>
          match.status === "PLAYED" &&
          match.home_score !== null &&
          match.away_score !== null
      )
      .sort((a, b) => {
        const aDate = a.played_at ?? a.scheduled_at ?? a.created_at;
        const bDate = b.played_at ?? b.scheduled_at ?? b.created_at;
        return bDate.localeCompare(aDate);
      })
      .slice(0, 5)
      .map((match) => ({
        id: match.id,
        homeTeamCode: match.home_team_code,
        awayTeamCode: match.away_team_code,
        homeScore: match.home_score as number,
        awayScore: match.away_score as number,
        playedAt: match.played_at,
      }));

    const standings: HomeStanding[] = (data?.standings ?? []).slice(0, 5).map((row) => ({
      position: row.position,
      teamCode: row.teamCode,
      played: row.played,
      won: row.won,
      drawn: row.drawn,
      lost: row.lost,
      goalDifference: row.goalDifference,
      points: row.points,
    }));

    const aggregates = new Map<string, HomeFeaturedPlayer>();

    for (const raw of stats) {
      const matchCompetitionId = Array.isArray(raw.matches)
        ? raw.matches[0]?.competition_id
        : raw.matches?.competition_id;

      if (matchCompetitionId !== competition.id) continue;

      const position = normalizePosition(raw.position_at_match);
      if (!position) continue;

      const key = `${raw.player_id ?? `${raw.team_code}:${raw.esms_name}`}::${position}`;
      const player = raw.player_id ? playerById.get(raw.player_id) : null;

      const current = aggregates.get(key) ?? {
        playerId: raw.player_id,
        esmsName: raw.esms_name,
        displayName: player?.full_name?.trim() || raw.esms_name.replaceAll("_", " "),
        teamCode: raw.team_code,
        position,
        appearances: 0,
        minutes: 0,
        goals: 0,
        assists: 0,
        mom: 0,
        tackles: 0,
        keyPasses: 0,
        saves: 0,
        conceded: 0,
        score: 0,
        photoUrl: player?.photo_url ?? null,
      };

      current.teamCode = raw.team_code;
      current.appearances += raw.participated ?? 0;
      current.minutes += raw.minutes ?? 0;
      current.goals += raw.goals ?? 0;
      current.assists += raw.assists ?? 0;
      current.mom += raw.mom ?? 0;
      current.tackles += raw.tackles ?? 0;
      current.keyPasses += raw.key_passes ?? 0;
      current.saves += raw.saves ?? 0;
      current.conceded += raw.conceded ?? 0;
      aggregates.set(key, current);
    }

    const featuredByPosition: Record<string, HomeFeaturedPlayer[]> = {};

    for (const position of POSITIONS) {
      featuredByPosition[position] = Array.from(aggregates.values())
        .filter((player) => player.position === position && player.appearances > 0)
        .map((player) => ({
          ...player,
          score: performanceScore(position, player),
        }))
        .sort(
          (a, b) =>
            b.score - a.score ||
            b.minutes - a.minutes ||
            a.displayName.localeCompare(b.displayName)
        )
        .slice(0, 5);
    }

    byCompetition[competition.id] = {
      competition,
      results,
      standings,
      featuredByPosition,
    };
  }

  return {
    totals: {
      clubs: clubsResult.count ?? 0,
      players: currentPlayers.length,
      competitions: competitions.length,
      movements: market.totals.movements,
    },
    latestTransfers: market.latestMovements
      .filter((movement) => movement.movementType !== "PENDING")
      .slice(0, 5)
      .map((movement) => {
        const player = playerById.get(movement.playerId);

        return {
          id: movement.id,
          playerId: movement.playerId,
          playerName: movement.playerName,
          fromTeamCode: movement.fromTeamCode,
          toTeamCode: movement.toTeamCode,
          movementType: movement.movementType,
          transferDate: movement.transferDate,
          fee: movement.fee,
          photoUrl: player?.photo_url ?? null,
        };
      }),
    competitions: options,
    byCompetition,
  };
}

export function homeClubName(teamCode: string) {
  return getClubName(teamCode);
}
