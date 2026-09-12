import { getSupabaseAdmin } from "@/lib/supabase-admin";

type AnyRow = Record<string, any>;

export type ClubMatchCompetition = {
  id: string;
  name: string;
  type: string;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
};

export type ClubMatchItem = {
  id: string;
  competitionId: string;
  competitionName: string;
  roundName: string | null;
  roundNumber: number | null;
  homeTeamCode: string;
  awayTeamCode: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  scheduledAt: string | null;
  playedAt: string | null;
  date: string | null;
};

export type ClubMatchesData = {
  seasons: { id: string; name: string; isActive: boolean }[];
  season: { id: string; name: string } | null;
  competitions: ClubMatchCompetition[];
  matches: ClubMatchItem[];
  played: ClubMatchItem[];
  upcoming: ClubMatchItem[];
  nextMatch: ClubMatchItem | null;
  recent: ClubMatchItem[];
  stats: {
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
  };
};

function n(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function matchDate(row: AnyRow) {
  return row.played_at ?? row.scheduled_at ?? row.created_at ?? null;
}

function timeValue(value: string | null) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const v = new Date(value).getTime();
  return Number.isFinite(v) ? v : Number.MAX_SAFE_INTEGER;
}

export async function getClubMatches(teamCodeInput: string, seasonIdInput?: string | null): Promise<ClubMatchesData> {
  const teamCode = teamCodeInput.toUpperCase();
  const supabase = getSupabaseAdmin();

  const seasonsResult = await supabase
    .from("seasons")
    .select("id,name,is_active,starts_at,created_at")
    .order("created_at", { ascending: false });
  if (seasonsResult.error) throw seasonsResult.error;

  const seasons = ((seasonsResult.data ?? []) as AnyRow[]).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    isActive: Boolean(row.is_active),
  }));
  const selectedSeason = seasons.find((s) => s.id === seasonIdInput) ?? seasons.find((s) => s.isActive) ?? seasons[0] ?? null;

  if (!selectedSeason) {
    return { seasons, season: null, competitions: [], matches: [], played: [], upcoming: [], nextMatch: null, recent: [], stats: { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 } };
  }

  const [competitionsResult, membershipsResult] = await Promise.all([
    supabase
      .from("competitions")
      .select("id,name,type,season_id,points_win,points_draw,points_loss")
      .eq("season_id", selectedSeason.id)
      .order("created_at", { ascending: true }),
    supabase.from("competition_teams").select("competition_id,team_code").eq("team_code", teamCode),
  ]);
  if (competitionsResult.error) throw competitionsResult.error;
  if (membershipsResult.error) throw membershipsResult.error;

  const memberships = new Set(((membershipsResult.data ?? []) as AnyRow[]).map((row) => String(row.competition_id)));
  const competitions: ClubMatchCompetition[] = ((competitionsResult.data ?? []) as AnyRow[])
    .filter((row) => memberships.has(String(row.id)))
    .map((row) => ({
      id: String(row.id),
      name: String(row.name),
      type: String(row.type),
      pointsWin: n(row.points_win || 3),
      pointsDraw: n(row.points_draw || 1),
      pointsLoss: n(row.points_loss || 0),
    }));

  const ids = competitions.map((c) => c.id);
  if (!ids.length) {
    return { seasons, season: selectedSeason, competitions, matches: [], played: [], upcoming: [], nextMatch: null, recent: [], stats: { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 } };
  }

  const [roundsResult, matchesResult] = await Promise.all([
    supabase
      .from("competition_rounds")
      .select("id,competition_id,number,name")
      .in("competition_id", ids),
    supabase
      .from("matches")
      .select("id,competition_id,round_id,home_team_code,away_team_code,home_score,away_score,status,scheduled_at,played_at,created_at")
      .in("competition_id", ids)
      .or(`home_team_code.eq.${teamCode},away_team_code.eq.${teamCode}`),
  ]);
  if (roundsResult.error) throw roundsResult.error;
  if (matchesResult.error) throw matchesResult.error;

  const competitionById = new Map(competitions.map((c) => [c.id, c]));
  const roundById = new Map(((roundsResult.data ?? []) as AnyRow[]).map((r) => [String(r.id), r]));
  const matches: ClubMatchItem[] = ((matchesResult.data ?? []) as AnyRow[]).map((row) => {
    const round = row.round_id ? roundById.get(String(row.round_id)) : null;
    return {
      id: String(row.id),
      competitionId: String(row.competition_id),
      competitionName: competitionById.get(String(row.competition_id))?.name ?? "Competición",
      roundName: round?.name ? String(round.name) : null,
      roundNumber: round?.number == null ? null : n(round.number),
      homeTeamCode: String(row.home_team_code),
      awayTeamCode: String(row.away_team_code),
      homeScore: row.home_score == null ? null : n(row.home_score),
      awayScore: row.away_score == null ? null : n(row.away_score),
      status: String(row.status),
      scheduledAt: row.scheduled_at ? String(row.scheduled_at) : null,
      playedAt: row.played_at ? String(row.played_at) : null,
      date: matchDate(row) ? String(matchDate(row)) : null,
    };
  });

  const played = matches
    .filter((m) => m.status === "PLAYED" && m.homeScore !== null && m.awayScore !== null)
    .sort((a, b) => timeValue(b.date) - timeValue(a.date));
  const upcoming = matches
    .filter((m) => m.status !== "PLAYED")
    .sort((a, b) => timeValue(a.date) - timeValue(b.date));

  let won = 0, drawn = 0, lost = 0, goalsFor = 0, goalsAgainst = 0, points = 0;
  for (const match of played) {
    const home = match.homeTeamCode === teamCode;
    const gf = home ? n(match.homeScore) : n(match.awayScore);
    const ga = home ? n(match.awayScore) : n(match.homeScore);
    goalsFor += gf;
    goalsAgainst += ga;
    const competition = competitionById.get(match.competitionId);
    if (gf > ga) { won += 1; points += competition?.pointsWin ?? 3; }
    else if (gf === ga) { drawn += 1; points += competition?.pointsDraw ?? 1; }
    else { lost += 1; points += competition?.pointsLoss ?? 0; }
  }

  return {
    seasons,
    season: selectedSeason,
    competitions,
    matches,
    played,
    upcoming,
    nextMatch: upcoming[0] ?? null,
    recent: played.slice(0, 5),
    stats: {
      played: played.length,
      won,
      drawn,
      lost,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      points,
    },
  };
}
