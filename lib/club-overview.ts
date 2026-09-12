import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAllPlayers } from "@/lib/all-players";
import { getClubHistory } from "@/lib/club-history";
import { getPositionPerformanceScore, type EsmsHistoryPosition } from "@/lib/performance-score";

const POSITIONS: EsmsHistoryPosition[] = ["GK", "DF", "DM", "MF", "AM", "FW"];

type AnyRow = Record<string, any>;

export type ClubOverviewCompetition = {
  id: string;
  name: string;
  type: string;
  status: string;
  seasonName: string;
};

export type ClubOverviewMatch = {
  id: string;
  competitionId: string;
  competitionName: string;
  homeTeamCode: string;
  awayTeamCode: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  date: string | null;
};

export type ClubOverviewFeaturedPlayer = {
  position: EsmsHistoryPosition;
  playerId: string | null;
  esmsName: string;
  displayName: string;
  photoUrl: string | null;
  appearances: number;
  minutes: number;
  goals: number;
  assists: number;
  saves: number;
  conceded: number;
  tackles: number;
  keyPasses: number;
  shots: number;
  mom: number;
  discipline: number;
  score: number;
};

export type ClubOverviewData = {
  clubClass: string | null;
  season: { id: string; name: string } | null;
  roster: {
    players: number;
    averageAge: number | null;
    nationalities: number;
  };
  titles: number;
  competitions: ClubOverviewCompetition[];
  recentMatches: ClubOverviewMatch[];
  nextMatch: ClubOverviewMatch | null;
  featured: ClubOverviewFeaturedPlayer[];
  palmares: Awaited<ReturnType<typeof getClubHistory>>["palmares"];
};

function n(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function matchDate(row: AnyRow) {
  return row.played_at ?? row.scheduled_at ?? row.created_at ?? null;
}

function normalizePosition(value: unknown): EsmsHistoryPosition | null {
  const position = String(value ?? "").trim().toUpperCase() as EsmsHistoryPosition;
  return POSITIONS.includes(position) ? position : null;
}

export async function getClubOverview(teamCodeInput: string): Promise<ClubOverviewData> {
  const teamCode = teamCodeInput.toUpperCase();
  const supabase = getSupabaseAdmin();

  const [seasonsResult, rosterResult, history, metadataResult] = await Promise.all([
    supabase.from("seasons").select("id,name,is_active,starts_at,created_at").order("created_at", { ascending: false }),
    getAllPlayers(),
    getClubHistory(teamCode),
    supabase.from("club_metadata").select("club_class").eq("team_code", teamCode).maybeSingle(),
  ]);

  if (seasonsResult.error) throw seasonsResult.error;
  if (metadataResult.error) throw metadataResult.error;
  const clubClass = metadataResult.data?.club_class ? String(metadataResult.data.club_class) : null;

  const seasons = (seasonsResult.data ?? []) as AnyRow[];
  const season = seasons.find((row) => row.is_active) ?? seasons[0] ?? null;
  const roster = rosterResult.filter((player) => player.teamCode.toUpperCase() === teamCode);
  const averageAge = roster.length
    ? roster.reduce((sum, player) => sum + n(player.age), 0) / roster.length
    : null;
  const nationalities = new Set(roster.map((player) => player.nat?.trim()).filter(Boolean)).size;

  if (!season) {
    return {
      clubClass,
      season: null,
      roster: { players: roster.length, averageAge, nationalities },
      titles: history.palmares.summary.total,
      competitions: [],
      recentMatches: [],
      nextMatch: null,
      featured: [],
      palmares: history.palmares,
    };
  }

  const [competitionsResult, membershipsResult, playersResult] = await Promise.all([
    supabase.from("competitions").select("id,name,type,status,season_id").eq("season_id", season.id).order("created_at", { ascending: true }),
    supabase.from("competition_teams").select("competition_id,team_code").eq("team_code", teamCode),
    supabase.from("players").select("id,esms_name,full_name,photo_url,current_team_code"),
  ]);

  for (const result of [competitionsResult, membershipsResult, playersResult]) {
    if (result.error) throw result.error;
  }

  const membershipIds = new Set((membershipsResult.data ?? []).map((row: AnyRow) => String(row.competition_id)));
  const competitions: ClubOverviewCompetition[] = ((competitionsResult.data ?? []) as AnyRow[])
    .filter((row) => membershipIds.has(String(row.id)))
    .map((row) => ({
      id: String(row.id),
      name: String(row.name),
      type: String(row.type),
      status: String(row.status),
      seasonName: String(season.name),
    }));

  const competitionIds = competitions.map((competition) => competition.id);
  if (!competitionIds.length) {
    return {
      clubClass,
      season: { id: String(season.id), name: String(season.name) },
      roster: { players: roster.length, averageAge, nationalities },
      titles: history.palmares.summary.total,
      competitions,
      recentMatches: [],
      nextMatch: null,
      featured: [],
      palmares: history.palmares,
    };
  }

  const [matchesResult, statsResult] = await Promise.all([
    supabase
      .from("matches")
      .select("id,competition_id,home_team_code,away_team_code,home_score,away_score,status,scheduled_at,played_at,created_at")
      .in("competition_id", competitionIds)
      .or(`home_team_code.eq.${teamCode},away_team_code.eq.${teamCode}`),
    supabase
      .from("match_player_stats")
      .select("player_id,esms_name,team_code,position_at_match,participated,minutes,mom,saves,conceded,tackles,key_passes,shots,goals,assists,dp,matches!inner(competition_id)")
      .eq("team_code", teamCode),
  ]);

  if (matchesResult.error) throw matchesResult.error;
  if (statsResult.error) throw statsResult.error;

  const competitionById = new Map(competitions.map((competition) => [competition.id, competition]));
  const allMatches: ClubOverviewMatch[] = ((matchesResult.data ?? []) as AnyRow[]).map((row) => ({
    id: String(row.id),
    competitionId: String(row.competition_id),
    competitionName: competitionById.get(String(row.competition_id))?.name ?? "Competición",
    homeTeamCode: String(row.home_team_code),
    awayTeamCode: String(row.away_team_code),
    homeScore: row.home_score === null ? null : n(row.home_score),
    awayScore: row.away_score === null ? null : n(row.away_score),
    status: String(row.status),
    date: matchDate(row),
  }));

  const recentMatches = allMatches
    .filter((match) => match.status === "PLAYED" && match.homeScore !== null && match.awayScore !== null)
    .sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")))
    .slice(0, 5);

  const now = Date.now();
  const scheduled = allMatches
    .filter((match) => match.status !== "PLAYED")
    .sort((a, b) => {
      const ad = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
      const bd = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
      const aFuture = ad >= now ? 0 : 1;
      const bFuture = bd >= now ? 0 : 1;
      return aFuture - bFuture || ad - bd;
    });
  const nextMatch = scheduled[0] ?? null;

  const playerById = new Map(((playersResult.data ?? []) as AnyRow[]).map((row) => [String(row.id), row]));
  const aggregates = new Map<string, ClubOverviewFeaturedPlayer>();

  for (const raw of (statsResult.data ?? []) as AnyRow[]) {
    const joined = Array.isArray(raw.matches) ? raw.matches[0] : raw.matches;
    if (!joined || !competitionIds.includes(String(joined.competition_id))) continue;
    const position = normalizePosition(raw.position_at_match);
    if (!position) continue;

    const key = `${raw.player_id ?? raw.esms_name}::${position}`;
    const player = raw.player_id ? playerById.get(String(raw.player_id)) : null;
    const current = aggregates.get(key) ?? {
      position,
      playerId: raw.player_id ? String(raw.player_id) : null,
      esmsName: String(raw.esms_name ?? "Jugador"),
      displayName: String(player?.full_name ?? raw.esms_name ?? "Jugador").replaceAll("_", " "),
      photoUrl: player?.photo_url ? String(player.photo_url) : null,
      appearances: 0,
      minutes: 0,
      goals: 0,
      assists: 0,
      saves: 0,
      conceded: 0,
      tackles: 0,
      keyPasses: 0,
      shots: 0,
      mom: 0,
      discipline: 0,
      score: 0,
    };

    current.appearances += n(raw.participated);
    current.minutes += n(raw.minutes);
    current.goals += n(raw.goals);
    current.assists += n(raw.assists);
    current.saves += n(raw.saves);
    current.conceded += n(raw.conceded);
    current.tackles += n(raw.tackles);
    current.keyPasses += n(raw.key_passes);
    current.shots += n(raw.shots);
    current.mom += n(raw.mom);
    current.discipline += n(raw.dp);
    aggregates.set(key, current);
  }

  const featured = POSITIONS.map((position) => {
    const candidates = [...aggregates.values()]
      .filter((player) => player.position === position && player.appearances > 0)
      .map((player) => ({
        ...player,
        score: getPositionPerformanceScore({
          position,
          saves: player.saves,
          conceded: player.conceded,
          minutes: player.minutes,
          discipline: player.discipline,
          tackles: player.tackles,
          keyPasses: player.keyPasses,
          assists: player.assists,
          goals: player.goals,
          shots: player.shots,
        }) + player.mom * 2,
      }))
      .sort((a, b) => b.score - a.score || b.minutes - a.minutes);
    return candidates[0] ?? null;
  }).filter((player): player is ClubOverviewFeaturedPlayer => player !== null);

  return {
    clubClass,
    season: { id: String(season.id), name: String(season.name) },
    roster: { players: roster.length, averageAge, nationalities },
    titles: history.palmares.summary.total,
    competitions,
    recentMatches,
    nextMatch,
    featured,
    palmares: history.palmares,
  };
}
