import {
  getSupabaseAdmin,
} from "@/lib/supabase-admin";

export type CompetitionPlayerRankingRow = {
  playerId: string | null;
  esmsName: string;
  teamCode: string;

  appearances: number;
  minutes: number;
  mom: number;

  saves: number;
  conceded: number;
  tackles: number;
  keyPasses: number;
  shots: number;
  goals: number;
  assists: number;
  dp: number;

  dominantPosition: string | null;
  hatTricks: number;
  maxAssistsInMatch: number;
  maxAssistsMatchId: string | null;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
};

type RawRow = {
  match_id: string;
  player_id: string | null;
  esms_name: string;
  team_code: string;

  participated: number;
  minutes: number;
  mom: number;

  saves: number;
  conceded: number;
  tackles: number;
  key_passes: number;
  shots: number;
  goals: number;
  assists: number;
  dp: number;
  position_at_match: string | null;

  matches:
    | {
        competition_id: string;
      }
    | {
        competition_id: string;
      }[]
    | null;
};

const PAGE_SIZE = 1000;

async function getAllCompetitionPlayerStats(
  competitionId: string
): Promise<RawRow[]> {
  const supabase = getSupabaseAdmin();

  const allRows: RawRow[] = [];

  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;

    const {
      data,
      error,
    } = await supabase
      .from("match_player_stats")
      .select(
        `
          match_id,
          player_id,
          esms_name,
          team_code,
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
          position_at_match,
          matches!inner (
            competition_id
          )
        `
      )
      .eq(
        "matches.competition_id",
        competitionId
      )
      .order("id", {
        ascending: true,
      })
      .range(from, to);

    if (error) {
      throw error;
    }

    const rows =
      (data ?? []) as unknown as RawRow[];

    allRows.push(...rows);

    if (rows.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return allRows;
}

async function getCompetitionStatsRows(
  competitionIds: string[],
  teamCodes?: Set<string>
): Promise<RawRow[]> {
  const rows = (
    await Promise.all(
      competitionIds.map((competitionId) =>
        getAllCompetitionPlayerStats(competitionId)
      )
    )
  ).flat();

  if (!teamCodes) return rows;

  return rows.filter((row) => teamCodes.has(row.team_code));
}

export type CompetitionStatisticsBundle = {
  rankings: CompetitionPlayerRankingRow[];
  disciplineByMatch: Record<string, { yellowCards: number; redCards: number }>;
};

export async function getCompetitionStatistics(
  competitionId: string
): Promise<CompetitionStatisticsBundle> {
  const data = await getCompetitionStatsRows([competitionId]);
  return buildStatisticsFromRows(data);
}

export async function getCompetitionDisplayStatistics(
  competitionId: string
): Promise<CompetitionStatisticsBundle> {
  const supabase = getSupabaseAdmin();
  const { data: competition, error: competitionError } = await supabase
    .from("competitions")
    .select("id,name,season_id")
    .eq("id", competitionId)
    .maybeSingle();

  if (competitionError) throw competitionError;
  if (!competition) return getCompetitionStatistics(competitionId);

  const normalized = String(competition.name ?? "").toLocaleLowerCase("es");
  const isContinentalFinalPhase =
    normalized.includes("champions") ||
    normalized.includes("conference") ||
    normalized.includes("intertoto");

  if (!isContinentalFinalPhase) {
    return getCompetitionStatistics(competitionId);
  }

  const [
    { data: intercontinental, error: intercontinentalError },
    { data: teamRows, error: teamsError },
  ] = await Promise.all([
    supabase
      .from("competitions")
      .select("id")
      .eq("season_id", competition.season_id)
      .ilike("name", "%Intercontinental%")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("competition_teams")
      .select("team_code")
      .eq("competition_id", competitionId),
  ]);

  if (intercontinentalError) throw intercontinentalError;
  if (teamsError) throw teamsError;

  if (!intercontinental?.id) {
    return getCompetitionStatistics(competitionId);
  }

  const teamCodes = new Set(
    (teamRows ?? []).map((row) => String(row.team_code))
  );

  if (!teamCodes.size) {
    return getCompetitionStatistics(competitionId);
  }

  const data = await getCompetitionStatsRows(
    [String(intercontinental.id), competitionId],
    teamCodes
  );

  return buildStatisticsFromRows(data);
}

function buildStatisticsFromRows(
  data: RawRow[]
): CompetitionStatisticsBundle {

  const map = new Map<
    string,
    CompetitionPlayerRankingRow & {
      _positionCounts: Record<string, number>;
    }
  >();

  const disciplineMap = new Map<
    string,
    { yellowCards: number; redCards: number }
  >();

  for (const raw of data) {
    const discipline = disciplineMap.get(raw.match_id) ?? {
      yellowCards: 0,
      redCards: 0,
    };

    if ((raw.dp ?? 0) === 1) discipline.yellowCards += 1;
    if ((raw.dp ?? 0) === 10) discipline.redCards += 1;
    disciplineMap.set(raw.match_id, discipline);

    const key =
      raw.player_id ?? `${raw.team_code}::${raw.esms_name}`;

    const current = map.get(key) ?? {
      playerId: raw.player_id,
      esmsName: raw.esms_name,
      teamCode: raw.team_code,
      appearances: 0,
      minutes: 0,
      mom: 0,
      saves: 0,
      conceded: 0,
      tackles: 0,
      keyPasses: 0,
      shots: 0,
      goals: 0,
      assists: 0,
      dp: 0,
      dominantPosition: null,
      hatTricks: 0,
      maxAssistsInMatch: 0,
      maxAssistsMatchId: null,
      cleanSheets: 0,
      yellowCards: 0,
      redCards: 0,
      _positionCounts: {},
    };

    current.teamCode = raw.team_code;
    current.appearances += raw.participated ?? 0;
    current.minutes += raw.minutes ?? 0;
    current.mom += raw.mom ?? 0;
    current.saves += raw.saves ?? 0;
    current.conceded += raw.conceded ?? 0;
    current.tackles += raw.tackles ?? 0;
    current.keyPasses += raw.key_passes ?? 0;
    current.shots += raw.shots ?? 0;
    current.goals += raw.goals ?? 0;
    current.assists += raw.assists ?? 0;
    current.dp += raw.dp ?? 0;

    if ((raw.dp ?? 0) === 1) current.yellowCards += 1;
    if ((raw.dp ?? 0) === 10) current.redCards += 1;
    if ((raw.goals ?? 0) >= 3) current.hatTricks += 1;

    if ((raw.assists ?? 0) > current.maxAssistsInMatch) {
      current.maxAssistsInMatch = raw.assists ?? 0;
      current.maxAssistsMatchId = raw.match_id;
    }

    if ((raw.minutes ?? 0) > 0 && (raw.conceded ?? 0) === 0) {
      current.cleanSheets += 1;
    }

    const position = raw.position_at_match?.toUpperCase().trim();
    if (position) {
      current._positionCounts[position] =
        (current._positionCounts[position] ?? 0) + 1;
    }

    map.set(key, current);
  }

  const rankings = Array.from(map.values()).map((row) => {
    const dominantPosition =
      Object.entries(row._positionCounts).sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
      )[0]?.[0] ?? null;

    const { _positionCounts: positionCounts, ...clean } = row;
    void positionCounts;
    return { ...clean, dominantPosition };
  });

  return {
    rankings,
    disciplineByMatch: Object.fromEntries(disciplineMap),
  };
}

export async function getCompetitionPlayerRankings(
  competitionId: string
) {
  return (await getCompetitionStatistics(competitionId)).rankings;
}

export async function getCompetitionDisciplineByMatch(
  competitionId: string
) {
  return (await getCompetitionStatistics(competitionId)).disciplineByMatch;
}
