import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  getPositionPerformanceScore,
  normalizeScoresByPositionAndSeason,
  type EsmsHistoryPosition,
} from "@/lib/performance-score";

type Competition = {
  id: string;
  series_id: string | null;
  season_id: string;
  name: string;
  type: string;
  status: string;
  points_win: number;
  points_draw: number;
  points_loss: number;
};

type TeamRow = {
  competition_id: string;
  team_code: string;
};

type RoundRow = {
  id: string;
  competition_id: string;
  number: number;
  stage: string | null;
};

type MatchRow = {
  id: string;
  competition_id: string;
  round_id: string | null;
  home_team_code: string;
  away_team_code: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  created_at: string;
};

type StatRow = {
  match_id: string;
  player_id: string | null;
  team_code: string;
  esms_name: string;
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
};

type AwardHistoryRow = {
  player_id: string;
  rank: number | string;
  points: number | string;
};

export type HistoryPlayer = {
  playerId: string | null;
  playerName: string;
  teamCode: string;
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
  titles: number;
  awards: number;
  podiums: number;
  seasons: number;
  normalizedPerformance: number;
  bestSeasonIndex: number;
  hallScore: number;
};

export type LeagueHistoryData = {
  hallOfFame: HistoryPlayer[];
  playerLeaders: {
    goals: HistoryPlayer[];
    assists: HistoryPlayer[];
    mom: HistoryPlayer[];
    appearances: HistoryPlayer[];
    saves: HistoryPlayer[];
    tackles: HistoryPlayer[];
    keyPasses: HistoryPlayer[];
    awards: HistoryPlayer[];
    titles: HistoryPlayer[];
  };
};

type SeasonPositionAccumulator = {
  playerId: string;
  seasonId: string;
  position: EsmsHistoryPosition;
  rawScore: number;
  minutes: number;
};

const MATCH_CHUNK = 10;

function n(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return 0;
}

function played(match: MatchRow) {
  return (
    match.status === "PLAYED" &&
    match.home_score !== null &&
    match.away_score !== null
  );
}

function normalizePosition(value: unknown): EsmsHistoryPosition | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();

  return ["GK", "DF", "DM", "MF", "AM", "FW"].includes(normalized)
    ? (normalized as EsmsHistoryPosition)
    : null;
}

async function loadStats(matchIds: string[]) {
  const supabase = getSupabaseAdmin();
  const rows: StatRow[] = [];

  for (let index = 0; index < matchIds.length; index += MATCH_CHUNK) {
    const chunk = matchIds.slice(index, index + MATCH_CHUNK);

    const { data, error } = await supabase
      .from("match_player_stats")
      .select(
        "match_id,player_id,team_code,esms_name,participated,minutes,mom,saves,conceded,tackles,key_passes,shots,goals,assists,dp,position_at_match"
      )
      .in("match_id", chunk);

    if (error) throw error;

    rows.push(...((data ?? []) as StatRow[]));
  }

  return rows;
}

function dominantPosition(
  map: Map<EsmsHistoryPosition, number>
): EsmsHistoryPosition | null {
  let best: EsmsHistoryPosition | null = null;
  let bestMinutes = -1;

  for (const [position, minutes] of map.entries()) {
    if (minutes > bestMinutes) {
      best = position;
      bestMinutes = minutes;
    }
  }

  return best;
}

export async function getLeagueHistoryData(): Promise<LeagueHistoryData> {
  const supabase = getSupabaseAdmin();

  const [
    competitionsRes,
    teamsRes,
    roundsRes,
    matchesRes,
    awardHistoryRes,
  ] = await Promise.all([
    supabase.from("competitions").select("*").order("created_at"),
    supabase.from("competition_teams").select("competition_id,team_code"),
    supabase
      .from("competition_rounds")
      .select("id,competition_id,number,stage")
      .order("number"),
    supabase
      .from("matches")
      .select(
        "id,competition_id,round_id,home_team_code,away_team_code,home_score,away_score,status,created_at"
      )
      .order("created_at"),
    supabase.from("award_history").select("player_id,rank,points"),
  ]);

  if (competitionsRes.error) throw competitionsRes.error;
  if (teamsRes.error) throw teamsRes.error;
  if (roundsRes.error) throw roundsRes.error;
  if (matchesRes.error) throw matchesRes.error;
  if (awardHistoryRes.error) throw awardHistoryRes.error;

  const competitions = (competitionsRes.data ?? []) as Competition[];
  const teams = (teamsRes.data ?? []) as TeamRow[];
  const rounds = (roundsRes.data ?? []) as RoundRow[];
  const matches = (matchesRes.data ?? []) as MatchRow[];
  const playedMatches = matches.filter(played);
  const stats = await loadStats(playedMatches.map((match) => match.id));

  const competitionById = new Map(
    competitions.map((competition) => [competition.id, competition])
  );

  const matchCompetition = new Map(
    matches.map((match) => [match.id, match.competition_id])
  );

  const playerMap = new Map<string, HistoryPlayer>();
  const seasonPositionMap = new Map<string, SeasonPositionAccumulator>();
  const seasonPositionMinutes = new Map<
    string,
    Map<EsmsHistoryPosition, number>
  >();

  for (const row of stats) {
    const playerKey =
      row.player_id ?? `${row.team_code}::${row.esms_name}`;

    const player =
      playerMap.get(playerKey) ??
      ({
        playerId: row.player_id,
        playerName: row.esms_name,
        teamCode: row.team_code,
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
        titles: 0,
        awards: 0,
        podiums: 0,
        seasons: 0,
        normalizedPerformance: 0,
        bestSeasonIndex: 0,
        hallScore: 0,
      } satisfies HistoryPlayer);

    player.playerName = row.esms_name;
    player.teamCode = row.team_code;
    player.appearances += n(row.participated) > 0 || n(row.minutes) > 0 ? 1 : 0;
    player.minutes += n(row.minutes);
    player.goals += n(row.goals);
    player.assists += n(row.assists);
    player.mom += n(row.mom);
    player.saves += n(row.saves);
    player.conceded += n(row.conceded);
    player.tackles += n(row.tackles);
    player.keyPasses += n(row.key_passes);
    player.shots += n(row.shots);
    player.dp += n(row.dp);

    playerMap.set(playerKey, player);

    if (!row.player_id) continue;

    const competitionId = matchCompetition.get(row.match_id);
    const competition = competitionId
      ? competitionById.get(competitionId)
      : null;

    if (!competition) continue;

    const position = normalizePosition(row.position_at_match);
    if (!position) continue;

    const seasonId = competition.season_id;
    const seasonPlayerKey = `${row.player_id}::${seasonId}`;
    const positionMinutes =
      seasonPositionMinutes.get(seasonPlayerKey) ??
      new Map<EsmsHistoryPosition, number>();

    positionMinutes.set(
      position,
      (positionMinutes.get(position) ?? 0) + Math.max(1, n(row.minutes))
    );

    seasonPositionMinutes.set(seasonPlayerKey, positionMinutes);

    const accumulatorKey = `${row.player_id}::${seasonId}::${position}`;

    const accumulator =
      seasonPositionMap.get(accumulatorKey) ??
      ({
        playerId: row.player_id,
        seasonId,
        position,
        rawScore: 0,
        minutes: 0,
      } satisfies SeasonPositionAccumulator);

    accumulator.rawScore += getPositionPerformanceScore({
      position,
      saves: n(row.saves),
      conceded: n(row.conceded),
      minutes: n(row.minutes),
      discipline: n(row.dp),
      tackles: n(row.tackles),
      keyPasses: n(row.key_passes),
      assists: n(row.assists),
      goals: n(row.goals),
      shots: n(row.shots),
    });

    accumulator.minutes += n(row.minutes);

    seasonPositionMap.set(accumulatorKey, accumulator);
  }

  const dominantSeasonRows: SeasonPositionAccumulator[] = [];

  for (const [seasonPlayerKey, minutesMap] of seasonPositionMinutes.entries()) {
    const [playerId, seasonId] = seasonPlayerKey.split("::");
    const position = dominantPosition(minutesMap);
    if (!position) continue;

    const accumulator =
      seasonPositionMap.get(`${playerId}::${seasonId}::${position}`);

    if (accumulator) {
      dominantSeasonRows.push(accumulator);
    }
  }

  const normalizedSeasonRows = normalizeScoresByPositionAndSeason(
    dominantSeasonRows.map((row) => ({
      playerId: row.playerId,
      seasonId: row.seasonId,
      position: row.position,
      rawScore: row.rawScore,
    }))
  );

  const performanceByPlayer = new Map<
    string,
    { sum: number; count: number; best: number }
  >();

  for (const row of normalizedSeasonRows) {
    const current = performanceByPlayer.get(row.playerId) ?? {
      sum: 0,
      count: 0,
      best: 0,
    };

    current.sum += row.normalizedIndex;
    current.count += 1;
    current.best = Math.max(current.best, row.normalizedIndex);

    performanceByPlayer.set(row.playerId, current);
  }

  for (const player of playerMap.values()) {
    if (!player.playerId) continue;

    const performance = performanceByPlayer.get(player.playerId);
    if (!performance) continue;

    player.seasons = performance.count;
    player.normalizedPerformance =
      Math.round((performance.sum / performance.count) * 10) / 10;
    player.bestSeasonIndex = Math.round(performance.best * 10) / 10;
  }

  for (const row of (awardHistoryRes.data ?? []) as AwardHistoryRow[]) {
    const player = Array.from(playerMap.values()).find(
      (candidate) => candidate.playerId === row.player_id
    );

    if (!player) continue;

    if (n(row.rank) === 1) player.awards += 1;
    if (n(row.rank) <= 3) player.podiums += 1;
  }

  // Conservamos aquí el cálculo de títulos de forma sencilla:
  // si el equipo del jugador fue campeón y participó en esa competición,
  // se suma 1 título.
  const championByCompetition = new Map<string, string>();

  for (const competition of competitions.filter(
    (competition) => competition.status === "FINISHED"
  )) {
    const competitionMatches = matches.filter(
      (match) => match.competition_id === competition.id
    );

    if (competition.type === "LEAGUE") {
      const teamCodes = teams
        .filter((team) => team.competition_id === competition.id)
        .map((team) => team.team_code);

      const table = new Map<
        string,
        {
          teamCode: string;
          points: number;
          gf: number;
          ga: number;
        }
      >(
        teamCodes.map((teamCode) => [
          teamCode,
          { teamCode, points: 0, gf: 0, ga: 0 },
        ])
      );

      for (const match of competitionMatches.filter(played)) {
        const home = table.get(match.home_team_code);
        const away = table.get(match.away_team_code);
        if (!home || !away) continue;

        const hs = match.home_score ?? 0;
        const as = match.away_score ?? 0;

        home.gf += hs;
        home.ga += as;
        away.gf += as;
        away.ga += hs;

        if (hs > as) {
          home.points += competition.points_win;
          away.points += competition.points_loss;
        } else if (hs < as) {
          away.points += competition.points_win;
          home.points += competition.points_loss;
        } else {
          home.points += competition.points_draw;
          away.points += competition.points_draw;
        }
      }

      const champion = Array.from(table.values()).sort(
        (a, b) =>
          b.points - a.points ||
          b.gf - b.ga - (a.gf - a.ga) ||
          b.gf - a.gf ||
          a.teamCode.localeCompare(b.teamCode)
      )[0]?.teamCode;

      if (champion) championByCompetition.set(competition.id, champion);
    } else {
      const finalRoundIds = rounds
        .filter(
          (round) =>
            round.competition_id === competition.id &&
            String(round.stage ?? "").toUpperCase() === "FINAL"
        )
        .sort((a, b) => a.number - b.number)
        .map((round) => round.id);

      const final = competitionMatches
        .filter(
          (match) =>
            finalRoundIds.includes(match.round_id ?? "") &&
            played(match) &&
            match.home_score !== match.away_score
        )
        .at(-1);

      if (final) {
        championByCompetition.set(
          competition.id,
          (final.home_score ?? 0) > (final.away_score ?? 0)
            ? final.home_team_code
            : final.away_team_code
        );
      }
    }
  }

  const participation = new Map<
    string,
    { playerId: string; teamCode: string; competitionId: string }
  >();

  for (const row of stats) {
    if (!row.player_id) continue;
    if (!(n(row.participated) > 0 || n(row.minutes) > 0)) continue;

    const competitionId = matchCompetition.get(row.match_id);
    if (!competitionId) continue;

    participation.set(`${competitionId}::${row.player_id}`, {
      playerId: row.player_id,
      teamCode: row.team_code,
      competitionId,
    });
  }

  for (const entry of participation.values()) {
    const champion = championByCompetition.get(entry.competitionId);
    if (!champion || champion !== entry.teamCode) continue;

    const player = Array.from(playerMap.values()).find(
      (candidate) => candidate.playerId === entry.playerId
    );

    if (player) player.titles += 1;
  }

  for (const player of playerMap.values()) {
    /*
     * El componente principal ya NO depende de la escala bruta de GK/DF/etc.
     * normalizedPerformance es comparable entre posiciones.
     *
     * Carrera:
     * - rendimiento medio de temporada: base principal
     * - mejor pico de carrera
     * - títulos/premios/podios/MVP/longevidad
     */
    player.hallScore =
      Math.round(
        (
          player.normalizedPerformance * 6 +
          player.bestSeasonIndex * 2 +
          player.titles * 20 +
          player.awards * 40 +
          player.podiums * 10 +
          player.mom * 2 +
          Math.min(player.appearances, 300) * 0.2
        ) * 10
      ) / 10;
  }

  const players = Array.from(playerMap.values());

  function leader(key: keyof HistoryPlayer, limit = 10) {
    return [...players]
      .filter((player) => n(player[key]) > 0)
      .sort(
        (a, b) =>
          n(b[key]) - n(a[key]) ||
          b.minutes - a.minutes ||
          a.playerName.localeCompare(b.playerName)
      )
      .slice(0, limit);
  }

  return {
    hallOfFame: [...players]
      .filter((player) => player.seasons > 0)
      .sort(
        (a, b) =>
          b.hallScore - a.hallScore ||
          b.normalizedPerformance - a.normalizedPerformance ||
          b.bestSeasonIndex - a.bestSeasonIndex ||
          b.awards - a.awards ||
          b.titles - a.titles
      )
      .slice(0, 25),

    playerLeaders: {
      goals: leader("goals"),
      assists: leader("assists"),
      mom: leader("mom"),
      appearances: leader("appearances"),
      saves: leader("saves"),
      tackles: leader("tackles"),
      keyPasses: leader("keyPasses"),
      awards: leader("awards"),
      titles: leader("titles"),
    },
  };
}
